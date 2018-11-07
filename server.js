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
    if (!exerciseUserId) {
      return res.send("unknown _id");
    }

    var savedExercise = await exercise.save();
    return res.json({
      userId: exercise.userId,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date
    });
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
  userId: String,
  description: String,
  duration: Number,
  date: Date
});

//schema for displaying log
var logSchema = new Schema({
  _id: String,
  username: String,
  count: Number,
  log: [exerciseSchema]
});

var User = mongoose.model("User", userSchema);
var Exercise = mongoose.model("Exercise", exerciseSchema);

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
