let app = angular.module('flapperNews', ['ui.router']);
app.config([
    '$stateProvider',
    '$urlRouterProvider',
    function( $stateProvider, $urlRouterProvider ) {
        $stateProvider
          .state('home', {
              url: '/home',
              templateUrl: '/home.html',
              controller: 'MainCtrl',
              resolve: {
                  postPromise: ['posts', function(posts) {
                      return posts.getAll();
                  }]
              }
          })
          .state('posts', {
              url: '/posts/{id}',
              templateUrl: '/posts.html',
              controller: 'PostsCtrl',
              resolve: {
                  post: ['$stateParams', 'posts', function($stateParams, posts) {
                      return posts.get($stateParams.id);
                  }]
              }
          })
          .state('login', {
              url:'/login',
              templateUrl: '/login.html',
              controller: 'AuthCtrl',
              onEnter: ['$state', 'auth', function($state, auth) {
                if (auth.isLoggedIn()) {
                    $state.go('home');
                }
              }]
          })
          .state('register', {
              url:'/register',
              templateUrl: '/register.html',
              controller: 'AuthCtrl',
              onEnter: ['$state', 'auth', function($state, auth) {
                if (auth.isLoggedIn()) {
                    $state.go('home');
                }
              }]
          })
        $urlRouterProvider.otherwise('home');

}])
app.factory('posts', ['$http', 'auth', function($http, auth) {
    let  o = {
        posts: []
    };
    o.getAll = function() {
        return $http.get('/posts').success(function(data) {
            angular.copy(data, o.posts);
        });
    };

    o.get = function(id) {
        return $http.get('/posts/' + id).then(function(res) {
            return res.data;
        });
    };

    o.create = function(post) {
        return $http.post('/posts', post, {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        }).success(function(data) {
            o.posts.push(data);
        })
    };

    o.upvote = function(post) {
        return $http.put('/posts/' + post._id + '/upvote', null,  {
            headers: {Authorization: 'Bearer ' + auth.getToken()}
        })
        .success(function(data) {
            post.upvotes++;
        });
    };

    o.addComment = function(id, comment) {
        return $http.post('/posts/' + id + '/comments', comment);
    };

    o.upvoteComment = function(post, comment) {
        return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote', null, {
            headers: {Authorization: 'Bearer ' + auth.getToken()} 
            })
            .success(function(data) {
                comment.upvotes++;
            });
    }

    return o;
}]);

app.factory('auth', ['$http', '$window', function($http, $window) {
    let auth = {};
    auth.saveToken = function(token) {
        $window.localStorage['flapper-news-token'] = token;
    }
    auth.getToken = function() {
        return $window.localStorage['flapper-news-token'];
    }
    auth.isLoggedIn = function() {
    let token = auth.getToken();
    if (token) {
        payload = JSON.parse($window.atob(token.split('.')[1]));
        return payload.exp > Date.now() / 100;
    } else {
        return false;
    }
    }

    auth.currentUser = function() {
    if (auth.isLoggedIn()) {
        let token = auth.getToken();
        let payload = JSON.parse($window.atob(token.split('.')[1])); 
        return payload.username;
    }
    }

    auth.register = function(user) {
    return $http.post('/register', user).success(function(data) {
        auth.saveToken(data.token);
    });
    }

    auth.logIn = function(user) {
        return $http.post('/login', user).success(function(data) {
            auth.saveToken(data.token);
        });
    }

    auth.logOut = function() {
        $window.localStorage.removeItem('flapper-news-token');
    }

    return auth;
}])

.controller('AuthCtrl', [
    '$scope',
    '$state',
    'auth',
    function($scope, $state, auth){
      $scope.user = {};

      $scope.register = function(){
        auth.register($scope.user).error(function(error){
          $scope.error = error;
        }).then(function(){
          $state.go('home');
        });
      };
    
      $scope.logIn = function(){
        auth.logIn($scope.user).error(function(error){
          $scope.error = error;
        }).then(function(){
          $state.go('home');
        });
      };
    }])

.controller('NavCtrl', [
    '$scope',
    'auth',
    function($scope, auth){
        $scope.isLoggedIn = auth.isLoggedIn;
        $scope.currentUser = auth.currentUser;
        $scope.logOut = auth.logOut;
    }]);

app.controller('MainCtrl', [
    '$scope',
    'posts',
    function($scope, posts, auth){
      $scope.test = 'Hello world!';
      $scope.isLoggedIn = auth.isLoggedIn;
      $scope.posts = posts.posts;

    $scope.addPost = function() {
      if ($scope.title === '' || !$scope.title) { return; }
      posts.create({
          title: $scope.title,
          link: $scope.link
        });
      $scope.title = '';
      $scope.link = '';
    };

    $scope.incrementUpvotes = function(post) {
      posts.upvote(post);
    };

}]);

app.controller('PostsCtrl', [
    '$scope',
    'posts',
    'post',
    function($scope, posts, post, auth) {
        $scope.post = post;
        $scope.isLoggedIn = auth.isLoggedIn;
        $scope.incrementUpvotes = function(comment) {
            posts.upvoteComment(post, comment);
        };

        $scope.addComment = function() {
            if ($scope.body === '') { return; }
            posts.addComment(post._id, {
                body: $scope.body,
                author: 'user'
              }).success(function(comment) {
                  $scope.post.comments.push(comment);
              });
        $scope.body = '';
    };
}]);