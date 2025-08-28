const path = require("path");
const express = require("express");

const configViewEngine = (app) => {
    // Config view engine
    app.set("views", path.join('./src', "views"));
    app.set("view engine", "ejs");
    
    // Config static files
    app.use(express.static(path.join('./src', "public")));
    app.use('/uploads', express.static(path.join('./src', "public", "uploads")));
};

module.exports = configViewEngine;
