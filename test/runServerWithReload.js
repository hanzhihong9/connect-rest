var _ = require('lodash'),
  $ = require('gulp-load-plugins')(),
  opn = require('opn'),
  serveStatic = require('serve-static'),
  serveIndex = require('serve-index'),
  minilr = require('mini-lr'),
  gulp = require('gulp'),
  interceptor = require('express-interceptor'),
  utils = require('./utils'),
  notifier = require('node-notifier'),
	chokidar = require('chokidar');

var app = require('connect')();

// options.ignor
// options.used
// options.once -- options.once + options.used === options.ignor
function restApiCallback(r, c, cb) {
	const actions = _.isArray(action) ? action : [action];
		leftActions = actions.filter( function (aAction) { // filter the ignors
			const options = aAction.options || {},
				ignor = options.ignor,
				used = options.used,
				once = options.once;
			return !( ignor || (used && once));
		});
	let retAction = leftActions.length > 0 ? leftActions[0] : null;
	if(retAction && retAction.options){
		retAction.options.used = true;
	}

	if(cb) { 
		if(retAction) {
			return cb(null, retAction);
		}
		return cb({ignor:true}, null);
	}
	else {
		if(retAction) {
			return retAction;
		}
		else {
			throw { ignor:true}
		}
	}
}

function fillRestData(rest, restAPIObj) {
	_.forEach(restAPIObj, function(handle, method) {
		_.forEach(handle, function(action, path) {
			rest.addPath(method.toUpperCase(), path.startsWith('/') ? path : ('/' + path), _.isFunction(action) ? action : function(r, c, cb) {
				const actions = _.isArray(action) ? action : [action];
					leftActions = actions.filter( function (aAction) { // filter the ignors
						const options = aAction.options || {},
							ignor = options.ignor,
							used = options.used,
							once = options.once;
						return !( ignor || (used && once));
					});
				let retAction = leftActions.length > 0 ? leftActions[0] : null;
				if(leftActions.length > 0) {
					if(retAction.options){
						retAction.options.used = true;
					}
				}

				if(cb) { 
					if(retAction) {
						return cb(null, retAction);
					}
					return cb({ignor:true}, null);
				}
				else {
					if(retAction) {
						return retAction;
					}
					else {
						throw { ignor:true}
					}
				}
			});
			});
		});
}
function configureConnect() {
if(options.rest) {
	var rest = require('connect-rest').create({
		context: options.basePath,
		logger:{ level: 'error' }
	});

	// to be able to hot reload, the rest api objectio should be defined in a js file
	var jsonfilePath = require('path').join(process.cwd(), options.rest);
	var	restAPIObj = require(jsonfilePath);
	fillRestData(rest, restAPIObj);

	var mockapiPath = require('path').join(process.cwd(), '.mockapi'); 
      // var mockapiPathReg = new RegExp(mockapiPath); // can be used if is a only folder name
      var watcher = chokidar.watch(mockapiPath)
      watcher.on('ready', function() {
        watcher.on('change', (path, stats) => {
          console.log(`File ${path} changed under api mock folder -- reload the rest api path`, mockapiPath);
          // Object.keys(require.cache).forEach(function(id) {
          //   // console.log('cache key', id)
          //   if (mockapiPathReg.test(id)) {
          //     // console.log('deleting cache key', id)
          //     delete require.cache[id]
          //   }
          // })
          delete require.cache[path]; // path as id -- works only for one file

          rest.removeAllPathes();

          let newData = require( path ).rest
          fillRestData(rest, restAPIObj);
        })
      })

      app = app
        .use(require('body-parser').json())
        .use(rest.processRequest());
    }

    if(options.proxy) {
      app = app.use(options.basePath, require('proxy-middleware')(proxyOptions(options.proxy, options.basePath)));
		}
		return app;
}
