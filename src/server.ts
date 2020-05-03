import express = require('express');
import cors = require('cors');
import bodyParser = require('body-parser');
import { router as groupsRoutes } from './modules/groups/groups.routes';
import { router as studentsRoutes } from './modules/students/students.routes';
import { router as solutionsRoutes } from './modules/solutions/solutions.routes';
import { router as commentsRoutes } from './modules/comments/comments.routes';
import { router as tasksRoutes} from './modules/tasks/tasks.routes';
import { errorHandler } from './common/middlewares/errors.middleware';
import { authJwt } from './common/middlewares/auth.middleware';
import passport = require ('passport');
import { strategy } from './common/passport/auth.strategy';
import { AuthRoute } from './modules/auth/auth.routes';
import * as dotenv from 'dotenv';
dotenv.config();
import './database';

const app: express.Express = express();
app.use(cors());

//app.use(express.json());
app.use(bodyParser.json({limit: '60mb'}));
app.use(bodyParser.urlencoded({limit: '60mb', extended: true}))

app.use('/groups', authJwt, groupsRoutes);
app.use('/solutions', authJwt, solutionsRoutes);
app.use('/comments', authJwt, commentsRoutes);
app.use('/students', studentsRoutes);
app.use('/tasks', authJwt, tasksRoutes);

//authorization
passport.use(strategy);
app.use(passport.initialize());
app.use('/auth', new AuthRoute().router);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running in http://localhost:${PORT}`)
});
