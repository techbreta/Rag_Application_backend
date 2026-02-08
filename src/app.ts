import express, { Express } from 'express';
// import session from 'express-session';
import helmet from 'helmet';
import xss from 'xss-clean';
import ExpressMongoSanitize from 'express-mongo-sanitize';
// import compression from 'compression';
import cors from 'cors';
import passport from 'passport';
import httpStatus from 'http-status';
import config from './config/config';
import { morgan } from './modules/logger';
import { jwtStrategy } from './modules/auth';
import { authLimiter } from './modules/utils';
import { ApiError, GlobalError } from './modules/errors';
import routes from './routes/v1';



const app: Express = express();

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}
app.set('trust proxy', 1);


// app.use(
//   session({
//     secret:  'your-secret-key',
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       secure: false, // true if using HTTPS
//       maxAge: 1000 * 60 * 60 * 24 // 1 day
//     },

//   })
// );

// set security HTTP headers
app.use(helmet());

// enable cors
app.use(cors());
app.options('*', cors());

// parse json request body
app.use(express.json());

// parse urlencoded request body
app.use(express.urlencoded({ extended: true }));

// increase timeout for long-running operations like PDF generation
app.use((req, res, next) => {
  // Set longer timeout for specific routes that might use Puppeteer
  if (req.path.includes('/reports') || req.path.includes('/report')) {
    req.setTimeout(600000); // 10 minutes
    res.setTimeout(600000); // 10 minutes
  }
  next();
});

// sanitize request data
app.use(xss());
app.use(ExpressMongoSanitize());

// gzip compression
// app.use(compression());

// jwt authentication
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);
app.use(passport.initialize());


// loading authentication strategies(Google, Facebook)


// limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}

// v1 api routes
app.use('/v1', routes);



app.get("/api/health", (_, res) => {
  res.send({ status: "healthy" });
});
// send back a 404 error for any unknown api request
app.use((_req, _res, next) => {
  next(new ApiError('Not found', httpStatus.NOT_FOUND));
});

// convert error to ApiError, if needed
app.use(GlobalError);
 app.get('/oauth2callback', (req, res) => {
  console.log('req.query', req.query);
  res.send('OAuth2 callback received');
 });


export default app;
