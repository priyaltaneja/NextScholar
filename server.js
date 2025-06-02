const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// serve static files from the current directory
app.use(express.static(__dirname));

// serve index.html as the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 