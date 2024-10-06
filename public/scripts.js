// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAQKrvpYM2rfhkj2f8ajshI3yn9bHEn69E",
    authDomain: "idatracker.firebaseapp.com",
    projectId: "idatracker",
    storageBucket: "idatracker.appspot.com",
    messagingSenderId: "53769952755",
    appId: "1:53769952755:web:03db45d3423e522e1ac686",
    measurementId: "G-6J369MW6N5"
};

new Vue({
    el: '#app',
    data: {
        currentView: 'tracker',
        days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
        rows: [
            { behavior: 'Read 10 pages of a book', days: {}, achieved: 0, goal: 5 },
            { behavior: '3 liters of water', days: {}, achieved: 0, goal: 3 },
            { behavior: 'Date night with lover', days: {}, achieved: 0, goal: 1 },
            { behavior: 'Prayer/meditation time', days: {}, achieved: 0, goal: 5 },
            { behavior: 'Daily journaling', days: {}, achieved: 0, goal: 5 }
        ],
        newRow: { behavior: '', goal: null, days: {}, achieved: 0 },
        editingIndex: null,
        editingRow: { behavior: '', goal: null, days: {}, achieved: 0 },
        selectedRow: null,
        selectedReportType: 'weekly',
        reportData: null,
        chart: null,
        user: null,
        db: null,
        userDocRef: null
    },
    computed: {
        totalAchieved() {
            return this.rows.reduce((sum, row) => sum + Number(row.achieved), 0);
        },
        totalGoal() {
            return this.rows.reduce((sum, row) => sum + Number(row.goal), 0);  // Ensure it's treated as a number
        },
        totalNet() {
            return this.totalAchieved - this.totalGoal;
        }
    },    
    methods: {
        // Initialize Firebase and Firestore
        initApp() {
            firebase.initializeApp(firebaseConfig);  
            this.db = firebase.firestore();          
        },

        // Sign in user and load actions from Firestore
        signIn() {
            const provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider)
            .then(result => {
                const user = result.user;
                this.user = {
                    id: user.uid,
                    name: user.displayName,
                    email: user.email,
                    image: user.photoURL
                };
                this.loadActions();  // Load user actions/behaviors from Firestore
            })
            .catch(error => {
                console.error('Error signing in:', error);
            });
        },
        signOut() {
            firebase.auth().signOut().then(() => {
                this.user = null;
            }).catch(error => {
                console.error('Error signing out:', error);
            });
        },

        checkUserSignInStatus() {
            if (this.auth2.isSignedIn.get()) {
                const googleUser = this.auth2.currentUser.get();
                this.onSignIn(googleUser);
            }
        },
        onSignIn(googleUser) {
            const profile = googleUser.getBasicProfile();
            this.user = {
                id: profile.getId(),
                name: profile.getName(),
                email: profile.getEmail(),
                image: profile.getImageUrl()
            };
            this.initFirestore();
        },
        updateAchieved(row) {
            row.achieved = Object.values(row.days).filter(Boolean).length;
            this.saveToFirestore();
        },
        calculateNet(row) {
            return row.achieved - row.goal;
        },

        // Load actions from the "actions" collection
        loadActions() {
            if (this.user && this.db) {
                this.db.collection('actions').where('userId', '==', this.user.id).get()
                .then(querySnapshot => {
                    this.rows = [];
                    querySnapshot.forEach(doc => {
                        const actionData = doc.data();
                        this.rows.push({ id: doc.id, ...actionData });
                    });
                })
                .catch(error => {
                    console.error('Error fetching actions:', error);
                });
            }
        },

        // Add a new action to Firestore
        addRow() {
            if (this.newRow.behavior && this.newRow.goal) {
                const newAction = { ...this.newRow, userId: this.user.id };

                this.db.collection('actions').add(newAction)
                .then(docRef => {
                    this.rows.push({ id: docRef.id, ...newAction });
                    this.newRow = { behavior: '', goal: null, days: {}, achieved: 0 };  // Reset form
                })
                .catch(error => {
                    console.error('Error adding new action:', error);
                });
            }
        },

        // Edit an action in Firestore
        saveEdit() {
            if (this.editingRow.behavior && this.editingRow.goal) {
                const updatedAction = { ...this.editingRow };

                this.db.collection('actions').doc(this.editingRow.id).update(updatedAction)
                .then(() => {
                    this.rows[this.editingIndex] = { ...updatedAction };
                    this.cancelEdit();  // Reset editing form
                })
                .catch(error => {
                    console.error('Error updating action:', error);
                });
            }
        },

        // Delete an action from Firestore
        deleteRow(index) {
            const actionId = this.rows[index].id;

            if (confirm('Are you sure you want to delete this row?')) {
                this.db.collection('actions').doc(actionId).delete()
                .then(() => {
                    this.rows.splice(index, 1);  // Remove from local array
                })
                .catch(error => {
                    console.error('Error deleting action:', error);
                });
            }
        },

        // Select a row for editing
        editRow(index) {
            this.editingIndex = index;
            this.editingRow = { ...this.rows[index] };
        },

        // Cancel the editing
        cancelEdit() {
            this.editingIndex = null;
            this.editingRow = { behavior: '', goal: null, days: {}, achieved: 0 };
        },
        selectRow(index) {
            this.selectedRow = this.selectedRow === index ? null : index;
        },
        generateReport() {
            const labels = [];
            const achievedData = [];
            const goalData = [];
    
            switch (this.selectedReportType) {
                case 'daily':
                    this.days.forEach(day => {
                        labels.push(day);
                        achievedData.push(Math.floor(Math.random() * 10));
                        goalData.push(10);
                    });
                    break;
                case 'weekly':
                    for (let i = 1; i <= 4; i++) {
                        labels.push(`Week ${i}`);
                        achievedData.push(Math.floor(Math.random() * 50));
                        goalData.push(50);
                    }
                    break;
                case 'monthly':
                    for (let i = 1; i <= 12; i++) {
                        labels.push(`Month ${i}`);
                        achievedData.push(Math.floor(Math.random() * 200));
                        goalData.push(200);
                    }
                    break;
                case 'yearly':
                    for (let i = 2020; i <= 2023; i++) {
                        labels.push(`Year ${i}`);
                        achievedData.push(Math.floor(Math.random() * 2000));
                        goalData.push(2000);
                    }
                    break;
                case 'allTime':
                    labels.push('All Time');
                    achievedData.push(Math.floor(Math.random() * 10000));
                    goalData.push(10000);
                    break;
            }
    
            this.reportData = { labels, achievedData, goalData };
            this.$nextTick(() => this.renderChart());
        },
        renderChart() {
            const ctx = document.getElementById('reportChart').getContext('2d');
            
            if (this.chart) {
                this.chart.destroy();
            }
    
            this.chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: this.reportData.labels,
                    datasets: [
                        {
                            label: 'Achieved',
                            data: this.reportData.achievedData,
                            backgroundColor: 'rgba(3, 218, 198, 0.6)',
                            borderColor: 'rgba(3, 218, 198, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Goal',
                            data: this.reportData.goalData,
                            backgroundColor: 'rgba(98, 0, 234, 0.6)',
                            borderColor: 'rgba(98, 0, 234, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                color: 'white'
                            }
                        },
                        x: {
                            ticks: {
                                color: 'white'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: 'white'
                            }
                        },
                        title: {
                            display: true,
                            text: `${this.selectedReportType.charAt(0).toUpperCase() + this.selectedReportType.slice(1)} Performance Report`,
                            color: 'white',
                            font: {
                                size: 16
                            }
                        }
                    }
                }
            });
        }
    },
    mounted() {
        this.initApp();  // Initialize Firebase

        // Monitor sign-in status
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                this.user = {
                    id: user.uid,
                    name: user.displayName,
                    email: user.email,
                    image: user.photoURL
                };
                this.loadActions();  // Load actions on sign-in
            } else {
                this.user = null;
            }
        });
    }
});
