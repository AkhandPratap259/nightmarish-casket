const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
async function seed() {
  let demo = await User.findOne({ email: 'demo@orbit.example' });
  if (!demo) demo = await User.create({ name: 'Demo Orbiter', email: 'demo@orbit.example',
    passwordHash: await bcrypt.hash('Orbit123!', 10), bio: 'Building in public, one orbit at a time.', color: '#e4572e' });
  const others = [];
  for (const [name, email, bio, color] of [
    ['Aisha Khan', 'aisha@orbit.example', 'Photographer chasing golden hour.', '#2a7f6f'],
    ['Rohan Verma', 'rohan@orbit.example', 'Indie hacker. Shipping small things daily.', '#5b5ea6'],
    ['Meera Nair', 'meera@orbit.example', 'Runner, reader, filter-coffee loyalist.', '#a63d6f'],
  ]) {
    let u = await User.findOne({ email });
    if (!u) u = await User.create({ name, email, passwordHash: await bcrypt.hash('Orbit123!', 10), bio, color });
    others.push(u);
  }
  // Demo follows everyone, so the Following tab has content on first sign-in.
  demo.following = others.map((u) => u._id); await demo.save();
  for (const u of others) if (!u.followers.includes(demo._id)) { u.followers.push(demo._id); await u.save(); }
  if ((await Post.countDocuments()) === 0) {
    const texts = [
      [others[0], 'Golden hour over the lake today. No filter, just patience. #photography #goldenhour'],
      [others[1], 'Shipped a tiny feature this morning: the feed now explains why each post ranks where it does. Transparency > magic. #buildinpublic #webdev'],
      [others[2], '10k easy run done before sunrise. The city feels different at 5am. #running #morning'],
      [others[0], 'Portraits hit differently when the subject forgets the camera exists. #photography #portraits'],
      [others[1], 'Hot take: a social app should show its ranking maths, not hide it behind "the algorithm". #buildinpublic #webdev'],
      [others[2], 'Filter coffee, a paperback, and nowhere to be for an hour. Small joys compound. #reading #slowmornings'],
      [demo, 'Hello Orbit! First post from the demo account. Say hi and try the follow button. #welcome'],
      [others[1], 'Weekend project idea: a feed that decays with time so yesterday cannot outrank today forever. #webdev #ideas'],
    ];
    const posts = [];
    for (const [author, text] of texts) {
      const tags = [...new Set((text.match(/#[A-Za-z0-9_]+/g) || []).map((t) => t.slice(1).toLowerCase()))];
      posts.push(await Post.create({ author: author._id, text, tags }));
    }
    posts[1].likes = [demo._id, others[0]._id, others[2]._id]; await posts[1].save();
    posts[0].likes = [demo._id, others[1]._id]; await posts[0].save();
    posts[4].likes = [others[0]._id, others[2]._id]; await posts[4].save();
    await Comment.create({ post: posts[1]._id, author: others[2]._id, text: 'Love this. Show the maths!' });
    await Comment.create({ post: posts[1]._id, author: demo._id, text: 'Exactly — it is right under each post.' });
    await Comment.create({ post: posts[0]._id, author: others[1]._id, text: 'That light is unreal.' });
  }
}
module.exports = seed;
