var express = require('express');
var router = express.Router();


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

let mongoose = require('mongoose');
let Post = mongoose.model('Post');
let Comment = mongoose.model('Comment');

let passport = require('passport');
let User = mongoose.model('User');
let jwt = require('express-jwt');
let auth = jwt({secret: 'SECRET', userProperty: 'payload'})

router.post('/register', function(req, res, next){
  if(!req.body.username || !req.body.password){
    return res.status(400).json({message: 'Please fill out all fields'});
  }

  var user = new User();

  user.username = req.body.username;

  user.setPassword(req.body.password)

  user.save(function (err){
    if(err){ return next(err); }

    return res.json({token: user.generateJWT()})
  });
});

router.post('/login', function(req, res, next){
  if(!req.body.username || !req.body.password){
    return res.status(400).json({message: 'Please fill out all fields'});
  }

  passport.authenticate('local', function(err, user, info){
    if(err){ return next(err); }

    if(user){
      return res.json({token: user.generateJWT()});
    } else {
      return res.status(401).json(info);
    }
  })(req, res, next);
});


router.get('/posts', function(req, res, next) {
  post.find(function(err, posts){
    if (err) { next(err); }
    res.json(posts);
  })
})

router.post('/posts', auth, function(req, res, next) {
  let post = new Post(req.body);
  post.author = req.payload.username;
  post.save(function(err, post) {
    if (err) { return next(err) }
    res.json(post);
  });
});

router.param('post', function(req, res, next, id) {
  let query = Post.findById(id);
  query.exec(function(err, post) {
    if (err) { return next(err); }
    if (!post) { return next(new Error('no post found')); }
    req.post = post;
    return next();
  });
});

router.param('comment', function(req, res, next, id) {
  let query = Comment.findById(id);
  query.exec(function(err, comment) {
    if (err) { return next(err); }
    if (!comment) { return next(new Error('no comment found')); }
    req.comment = comment;
    return next();
  });
});

router.get('/posts/:post', function(req, res) {
  req.post.populate('comments', function(err) {
    if (err) { return next(err); }
    res.json(req.post);
  })
});

router.put('/posts/:post/upvote', auth, function(req, res, next) {
  req.post.upvote(function(err, post) {
    if (err) { return next(err); }
    res.json(post);
  });
});

router.put('/posts/:post/comments/:comment/upvote', auth, function(req, res, next) {
  req.comment.upvote(function(err, comment) {
    if (err) { return next(err); }
    res.json(comment);
  });
});

router.post('/posts/:post/comments', auth, function(req, res, next) {
  let comment = new Comment(req.body);
  comment.post = req.post;
  comment.author = req.payload.username;
  comment.save(function(err, comment) {
    if (err) { return next(err); }
    req.post.comments.push(comment);
    req.post.save(function(err, post) {
      if (err) { return next(err); }
      res.json(comment)
    })

  })
})

module.exports = router;
