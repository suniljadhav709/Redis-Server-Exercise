const express = require('express');
const router = express.Router();
const recipeData = require("../../recipe-data");
const uuid = require("node-uuid");

router.get("/", (req, res) => {
    console.log('Getting all recepies.');
    recipeData
        .getAllRecipes()
        .then((recipeList) => {
            res.json(recipeList);
        })
        .catch(() => {
            // Something went wrong with the server!
            res.sendStatus(500);
        });
});

router.post("/", (req, res) => {
    console.log('in slash method with recipe data : ' + JSON.stringify(req.body.recipe));
    var newRecipe = req.body.recipe;

    var redisConnection = req
        .app
        .get("redis");

    var messageId = uuid.v4();
    var killswitchTimeoutId = undefined;

    redisConnection.on(`recipe-created:${messageId}`, (insertedRecipe, channel) => {
        console.log('Message recipe-created received from worker function ');
        res.json(insertedRecipe);
        redisConnection.off(`recipe-created:${messageId}`);
        redisConnection.off(`recipe-created-failed:${messageId}`);

        clearTimeout(killswitchTimeoutId);
    });

    redisConnection.on(`recipe-created-failed:${messageId}`, (error, channel) => {
        res
            .status(500)
            .json(error);

        redisConnection.off(`recipe-created:${messageId}`);
        redisConnection.off(`recipe-created-failed:${messageId}`);

        clearTimeout(killswitchTimeoutId);
    });

    killswitchTimeoutId = setTimeout(() => {
        redisConnection.off(`recipe-created:${messageId}`);
        redisConnection.off(`recipe-creation-failed:${messageId}`);
        res
            .status(500)
            .json({ error: "Timeout error" })
    }, 5000);

    redisConnection.emit(`create-recipe:${messageId}`, {
        //console.log('Emiting message for creating recipe.');
        requestId: messageId,
        recipe: newRecipe
    });

});

module.exports = router;