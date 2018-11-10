const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const shortid = require("shortid");
const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(
  process.env.MLAB_URI ||
    "mongodb://jefferylgraham:passw0rd@ds153093.mlab.com:53093/exercise-tracker",
  {
    useMongoClient: true
  }
);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/exercise/new-user", async (req, res) => {
  try {
    var user = new User(req.body);

    //check to see if username already exists
    var duplicate = await User.findOne({ username: user.username });
    if (duplicate) {
      return res.send("username already taken");
    }

    var savedUser = await user.save();
    return res.json({ username: user.username, _id: user.id });
  } catch (error) {}
});

app.post("/api/exercise/add", async (req, res) => {
  try {
    var exercise = new Exercise(req.body);

    //check to see if id is in db before saving exercise entry
    var exerciseUserId = await User.findOne({ _id: exercise.userId });
    console.log(exerciseUserId.username);
    if (!exerciseUserId) {
      return res.send("unknown _id");
    }

    var savedExercise = await exercise.save();
    return res.json({
      username: exerciseUserId.username,
      description: exercise.description,
      duration: exercise.duration,
      _id: exercise.userId,
      date: exercise.date.toDateString()
    });
  } catch (error) {}
});

app.get("/api/exercise/log?", async (req, res) => {
  try {
    //get user id from request
    var userId = req.query.userId;
    var from = req.query.from || "1900-01-01";
    var to = req.query.to || "3000-12-31";
    var limit = req.query.limit;

    var userExists = await User.findOne({ _id: userId });

    //check to see if userId exists
    if (!userExists) {
      res.send("userId not found");
    } else {
      var exercises = await Exercise.find(
        { userId: userId, date: { $gt: from, $lt: to } },
        "description duration date -_id"
      ).limit(parseInt(limit));
      //map exercises to format date correctly
      console.log(exercises);
      var exercisesFormatted = exercises.map(obj => ({
        description: obj.description,
        duration: obj.duration,
        date: obj.date.toDateString()
      }));

      res.json({
        _id: userId,
        username: userExists.username,
        count: exercises.length,
        log: exercisesFormatted
      });
    }
  } catch (error) {}
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

//set up Schema
var Schema = mongoose.Schema;

//schema for users
var userSchema = new Schema({
  username: String,
  _id: {
    type: String,
    default: shortid.generate
  }
});

//schema for exercises
var exerciseSchema = new Schema({
  username: String,
  userId: String,
  description: String,
  duration: Number,
  date: Date
});

var User = mongoose.model("User", userSchema);
var Exercise = mongoose.model("Exercise", exerciseSchema);

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
