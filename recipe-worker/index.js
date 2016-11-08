const recipeData = require("../recipe-data");
const fetch = require('node-fetch');

const NRP = require('node-redis-pubsub');
const config = {
    port: 6379, // Port of your locally running Redis server
    scope: 'recipes' // Use a scope to prevent two NRPs from sharing messages
};

const redisConnection = new NRP(config); // This is the NRP client

// Note, this is really bad.
const pixabayApiKey = "3432196-710f5c9e1d0f75f6c0aa4a34a";
const basePixabayUrl = `https://pixabay.com/api/?key=${pixabayApiKey}&safesearch=true&q=`;

redisConnection.on('delete-user:*', (data, channel) => {
    console.log('@Worker for Delete : ' + data.uuid);

    var messageId = data.requestId;

    recipeData.delete_user(data.uuid).then(function(result) {
        console.log('@ Worker delete results from data : ' + JSON.stringify(result));
        redisConnection.emit(`user-deleted:${messageId}`, result);
    });
});

redisConnection.on('create-user:*', (data, channel) => {
    console.log('create-user message received by worker function.');
    console.log('User Name : ', data.user.username);
    console.log('password : ', data.user.password);
    var messageId = data.requestId;
    var user = data.user;
    recipeData.addUser(user).then(function(new_user) {
            console.log('Creation Result to worker from data module');
            console.log('New User : ' + JSON.stringify(new_user));
            console.log('Publishing user-created message with id: ' + messageId);
            redisConnection.emit(`user-created:${messageId}`, new_user);
        },
        function(_error) {
            console.log(error);
            var result = { status: 'failure', error: _error };
            redisConnection.emit(`user-created:${messageId}`, result);
        });
});

redisConnection.on('get-users:*', (data, channel) => {
    console.log('get-users message received by worker function.');
    var messageId = data.requestId;
    console.log('Message Id @ Worker : ' + messageId);
    recipeData.getAllUsers().then(function(users) {
        console.log("all users from worker fucntion : " +
            JSON.stringify(users));
        console.log('Publishing returned-users message with id: ' + messageId);
        redisConnection.emit(`returned-users:${messageId}`, users[0]);
    }, function(error) {
        console.log("Error while getting all users : " + error);
        return false;
    });
});

redisConnection.on('update-user:*', (data, channel) => {
    console.log('update-user message received by worker function.');
    var messageId = data.requestId;

    console.log('Message Id @ Worker : ' + messageId);
    var user_update = {
        id: data.uuid,
        username: data.username,
        password: data.password,
        email: data.email,
        phone: data.phone
    };

    recipeData.update_User(user_update).then(function(result) {
        console.log(" *************Update Result from data : " +
            JSON.stringify(result));
        console.log('Publishing users-updated message with id: ' + messageId + " and data : " + result);
        redisConnection.emit(`user-updated:${messageId}`, result);
        //redisConnection.emit(`users-updated:${messageId}`, result);
    }, function(error) {
        console.log("Error while getting all users : " + error);
        return false;
    });
    //redisConnection.emit(`user-updated:${messageId}`, user_update);
});

redisConnection.on('create-recipe:*', (data, channel) => {
    console.log('create-recipe message received by worker function.');
    var messageId = data.requestId;

    var fullyComposeRecipe = recipeData
        .addRecipe(data.recipe)
        .then((newRecipe) => {
            return fetch(`${basePixabayUrl}${newRecipe.title}`).then((res) => {
                return res.json();
            }).then((response) => {
                return response
                    .hits
                    .map(x => x.previewURL)
                    .slice(0, 5);
            }).then((hits) => {
                return recipeData
                    .addImagesToRecipe(newRecipe._id, hits)
                    .then((recipeWithUrls) => {
                        return recipeData
                            .findRecipesWithIngredients(recipeWithUrls.ingredients.map(x => x.systemTitle))
                            .then(recipeList => {

                                var recipeListExceptCurrent = recipeList.filter(x => x._id !== newRecipe._id);

                                console.log(recipeListExceptCurrent);
                                // Perform logic here Go through entire recipe list Calculate the percentage
                                // matched for each. Compose an array of data calls to setup the percentage
                                // matched Add all, then resolve to recipeWithUrls
                                return recipeWithUrls;
                            });
                    })
            }).then((recipeWithUrls) => {
                redisConnection.emit(`recipe-created:${messageId}`, recipeWithUrls);
            }).catch(error => {
                console.log(error);
                // we will submit errors back to the frontend
            });
        });
});