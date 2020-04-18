import { Request, Response, NextFunction} from 'express';
import { Groups } from './groups.model';
import groupsService from './groups.service';

class GroupsController {
    public async createOne(req: Request, res: Response, next: NextFunction): Promise<any> {
        try {
            const group: Groups = await groupsService.createOne(req.body);
            res.send(group);
        } catch (e) {
            next(e);
        }
    }
    public async findOne(req: Request, res: Response, next: NextFunction) {
        try {
            const group: Groups = await groupsService.findOne(req.params.id);
            res.send(group);
        } catch (e) {
            next(e);
        }
    }
    public async updateOne(req: Request, res: Response, next: NextFunction) {
        try {
            const group: Groups = await groupsService.updateOne(req.params.id, req.body);
            res.send(group);
        } catch (e) {
            next(e);
        }
    }
    public async deleteOne(req: Request, res: Response, next: NextFunction) {
        try {
            const group: Groups = await groupsService.deleteOne(req.params.id);
            res.send(group);
        } catch (e) {
            next(e);
        }
    }
    public async findMany(req: Request, res: Response, next: NextFunction) {
        try {
            const groups: Groups[] = await groupsService.findMany();
            res.send(groups);
        } catch (e) {
            next(e);
        }
    }
}

const groupsController = new GroupsController();
export default groupsController;
