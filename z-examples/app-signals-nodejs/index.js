const testingApp = require("./src/app");

const app = async () => {
    console.log("starting app");
    await testingApp();
    console.log("finished app");
};

 app();