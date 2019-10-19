import {Model} from '@nozbe/watermelondb';
import {date, field} from '@nozbe/watermelondb/decorators';

export default class TaskMelon extends Model {
  static table = 'tasks';

  // static associations = {
  //   comments: { type: 'has_many', foreignKey: 'post_id' },
  // }
  // @action async addComment(body, author) {
  //   return await this.collections.get('comments').create(comment => {
  //     comment.post.set(this)
  //     comment.author.set(author)
  //     comment.body = body
  //   })
  // }

  // tslint:disable-next-line
  @field('title') title: string;
  @date('created') created;

  // @action async createSpam() {
  //   await this.update(post => {
  //     post.title = `7 ways to lose weight`
  //   })
  //   await this.collections.get('comments').create(comment => {
  //     comment.post.set(this)
  //     comment.body = "Don't forget to comment, like, and subscribe!"
  //   })
  // }
}
