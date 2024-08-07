const { default: AdminBro } = require("admin-bro");
const AdminBroExpress = require("@admin-bro/express");
const express = require("express");
const mongoose = require("mongoose");
const AdminBroMongoose = require("@admin-bro/mongoose");
const token=process.env.Token

//const {after,before}=require("./companies/actions/upload-image.hook")

AdminBro.registerAdapter(AdminBroMongoose);

const app = express();
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());



const CourseSchema = new mongoose.Schema({
  name: String,
  folderId: Number,
});
const UserSchema = new mongoose.Schema({
  deviceID: String,
  courses: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
  ],
});
const KeySchema = new mongoose.Schema({
  key: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
});
const User = mongoose.model("User", UserSchema);
const Course = mongoose.model("Course", CourseSchema);
const Key = mongoose.model("Key", KeySchema);








const canAccess = ({ currentAdmin, record }) => {
  return currentAdmin.role === "admin";
};

const adminBro = new AdminBro({
  resources: [User, Course, Key],
  rootPath: "/admin",
  branding: {
    companyName: "HertZ",
    softwareBrothers: false,
  },
});

const adminBroRouter = AdminBroExpress.buildAuthenticatedRouter(
  adminBro,
  {
    authenticate: async (email, password) => {
      // const user = await User.findOne({ email, password });
      // const admins = ['admin', 'teacher'];
      // return admins.includes(user.role) ? user : null;
      return { email: "test@email.com", password: 123, role: "admin" };
    },
    cookiePassword: "some-secret-password-used-to-secure-cookies",
  },
  null,
  {
    resave: true,
    saveUninitialized: true,
  }
);

app.use(adminBro.options.rootPath, adminBroRouter);
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
// mongoose.connect('mongodb://localhost:27017/adminbro-example', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
mongoose
  .connect(process.env.DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => console.error("MongoDB connection error:", err));


  
app.get("/", async (req, res) => {
  res.send("server is running cool");
});

app.post("/create", async (req, res) => {
  console.log(req.body);
  try {
    const user = await User.findOne({ deviceID: req.body.deviceID }).populate("courses");
    if (user) return res.json({ user, token });
     else {
      const newUser = await User.create({ deviceID: req.body.deviceID });
      res.json({
        user: newUser,
        token,
      });
    }
  } catch (e) {
    console.error("we have error >>>>>>>>>>>>>>>>>>>");
    console.error(e.message);
  }
});


app.post("/api", async (req, res) => {
  //console.log(req.body);
  if (!req.body || !req.body.key || !req.body.folderId || !req.body.user) {
    return res.json({ error: "Invalid Request" });
  }

  try {
    const user = await User.findOne({ _id: req.body.user._id });
    const password = await Key.findOne({
      key: req.body.key,
      courseId: req.body.folderId,
    });

    if (password && user) {
      if (   !password.userId ) {
        password.userId = user._id;
        await password.save();
        user.courses.push(req.body.folderId);
       await (await user.save()).populate('courses');
        return res.json({ user, token });
      }
       else   return res.json({ error: "This Key is Used" });
      
    } else res.json({ error: "Key is invalid" });
  } catch (e) {
    console.error("we have error >>>>>>>>>>>>>>>>>>>");
    console.error(e.message);
  }
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

