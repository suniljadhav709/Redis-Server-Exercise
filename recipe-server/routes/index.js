const recipeRoutes = require("./recipes");
const userRoutes = require("./user");




const constructorMethod = (app) => {
    app.set('superSecret', 'hastalavistababy');



    //recipeRoutes.use(middlewareCheck(req, res, next));
    app.use("/recipes", recipeRoutes);
    app.use("/users", userRoutes);
    app.get("/", (req, res) => {
        res.render("home", {});
    });


    // app.use("/users", (req, res) => {
    //     console.log(' Data : ' + req.body.param);
    //     console.log('Going to not get data instead will go to home ');
    //     res.redirect("/");
    // });

    app.use("*", (req, res) => {
        res.redirect("/");
    });



};

module.exports = constructorMethod;