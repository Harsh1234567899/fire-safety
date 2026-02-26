const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/fire-safety').then(async () => {
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log("USERS:", JSON.stringify(users.map(u => ({ systemId: u.systemId, role: u.role })), null, 2));
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
