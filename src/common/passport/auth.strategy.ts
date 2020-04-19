import passport = require('passport');
import { Strategy, ExtractJwt } from 'passport-jwt';
import { auth } from '../../modules/auth/auth.config';
import studentsService from '../../modules/students/students.service';
import teacherssService from '../../modules/teachers/teachers.service';
import { Unauthorized } from '../../common/exeptions/index';


const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: auth.secretKey,
    expiresIn: auth.expiresIn,
};

const strategy = new Strategy(opts, async (jwtPayload, done) => {

    try {
        const user = await studentsService.findOneByEmail(jwtPayload.email) || await teacherssService.findOneByEmail(jwtPayload.email);
        if (user) {
            done(null, user);
        } else {
            done(null, false);
        }
    } catch (err) {
        done(new Unauthorized(err.message), false);
    }
});

passport.use(strategy);