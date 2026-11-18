// PulseFit demo seed. All seeded content is labelled sample data
// (isSample) for trying the app locally. Session volumes and personal
// records are computed from the seeded sets below — never hand-typed —
// so the numbers always agree with the session records.
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Exercise = require('../models/Exercise');
const Template = require('../models/Template');
const Session = require('../models/Session');
const PersonalRecord = require('../models/PersonalRecord');
const Challenge = require('../models/Challenge');
const Plan = require('../models/Plan');
const { epleyOneRepMax, sessionVolume } = require('../utils/fitness');

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days, hour = 18) => {
  const d = new Date(Date.now() - days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const EXERCISES = [
  { name: 'Barbell Back Squat', muscleGroup: 'legs', equipment: 'Barbell', difficulty: 'intermediate', instructions: ['Set the bar across your upper back, not your neck.', 'Brace your core and sit back until your thighs are parallel.', 'Drive through your heels to stand.'] },
  { name: 'Bench Press', muscleGroup: 'chest', equipment: 'Barbell', difficulty: 'intermediate', instructions: ['Lie flat with eyes under the bar.', 'Lower the bar to mid-chest with elbows at about 45 degrees.', 'Press up without bouncing the bar off your chest.'] },
  { name: 'Deadlift', muscleGroup: 'back', equipment: 'Barbell', difficulty: 'advanced', instructions: ['Stand with the bar over mid-foot.', 'Hinge at the hips, grip the bar and keep your back flat.', 'Push the floor away and lock out with your glutes.'] },
  { name: 'Overhead Press', muscleGroup: 'shoulders', equipment: 'Barbell', difficulty: 'intermediate', instructions: ['Rack the bar at your upper chest.', 'Brace your glutes and core.', 'Press overhead until your arms are straight.'] },
  { name: 'Bent-Over Barbell Row', muscleGroup: 'back', equipment: 'Barbell', difficulty: 'intermediate', instructions: ['Hinge to about 45 degrees with a flat back.', 'Pull the bar to your lower ribs.', 'Lower under control without rounding your back.'] },
  { name: 'Pull-Up', muscleGroup: 'back', equipment: 'Pull-up bar', difficulty: 'advanced', instructions: ['Hang with a full grip, shoulders down.', 'Pull your chest to the bar.', 'Lower slowly to a dead hang.'] },
  { name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'Dumbbells', difficulty: 'beginner', instructions: ['Set the bench to about 30 degrees.', 'Press the dumbbells up and slightly together.', 'Lower slowly to chest level.'] },
  { name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', equipment: 'Dumbbells', difficulty: 'beginner', instructions: ['Sit tall with dumbbells at shoulder height.', 'Press up without arching your lower back.', 'Lower under control to the start.'] },
  { name: 'Lateral Raise', muscleGroup: 'shoulders', equipment: 'Dumbbells', difficulty: 'beginner', instructions: ['Hold light dumbbells at your sides.', 'Raise out to shoulder height with a soft elbow bend.', 'Lower slowly; do not swing.'] },
  { name: 'Bicep Curl', muscleGroup: 'arms', equipment: 'Dumbbells', difficulty: 'beginner', instructions: ['Keep your elbows pinned to your sides.', 'Curl the weight up without swinging.', 'Lower over two to three seconds.'] },
  { name: 'Triceps Rope Pushdown', muscleGroup: 'arms', equipment: 'Cable machine', difficulty: 'beginner', instructions: ['Keep elbows tight to your body.', 'Push the rope down until your arms are straight.', 'Let the weight rise slowly.'] },
  { name: 'Leg Press', muscleGroup: 'legs', equipment: 'Leg press machine', difficulty: 'beginner', instructions: ['Place feet shoulder-width on the platform.', 'Lower until your knees reach about 90 degrees.', 'Press without locking your knees.'] },
  { name: 'Romanian Deadlift', muscleGroup: 'legs', equipment: 'Barbell', difficulty: 'intermediate', instructions: ['Hold the bar in front of your thighs.', 'Push your hips back with a soft knee bend.', 'Feel the hamstrings stretch, then drive your hips forward.'] },
  { name: 'Walking Lunge', muscleGroup: 'legs', equipment: 'Dumbbells', difficulty: 'beginner', instructions: ['Step forward into a long lunge.', 'Drop the back knee toward the floor.', 'Push through the front heel to the next step.'] },
  { name: 'Leg Curl', muscleGroup: 'legs', equipment: 'Machine', difficulty: 'beginner', instructions: ['Lie face down with ankles under the pad.', 'Curl the pad toward your glutes.', 'Lower slowly without letting the plates slam.'] },
  { name: 'Standing Calf Raise', muscleGroup: 'legs', equipment: 'Machine', difficulty: 'beginner', instructions: ['Stand tall on the platform edge.', 'Rise onto your toes with a full stretch at the bottom.', 'Pause at the top of each rep.'] },
  { name: 'Plank', muscleGroup: 'core', equipment: 'Bodyweight', difficulty: 'beginner', instructions: ['Set forearms on the floor, elbows under shoulders.', 'Keep a straight line from head to heels.', 'Do not let your hips sag or pike.'] },
  { name: 'Hanging Leg Raise', muscleGroup: 'core', equipment: 'Pull-up bar', difficulty: 'intermediate', instructions: ['Hang with straight arms.', 'Raise your legs to 90 degrees without swinging.', 'Lower slowly.'] },
  { name: 'Cable Crunch', muscleGroup: 'core', equipment: 'Cable machine', difficulty: 'intermediate', instructions: ['Kneel facing the cable stack.', 'Crunch your ribs toward your hips.', 'Keep your hips still.'] },
  { name: 'Push-Up', muscleGroup: 'chest', equipment: 'Bodyweight', difficulty: 'beginner', instructions: ['Hands under shoulders, body in a straight line.', 'Lower your chest to the floor.', 'Press up without flaring your elbows.'] },
  { name: 'Dips', muscleGroup: 'arms', equipment: 'Parallel bars', difficulty: 'intermediate', instructions: ['Support yourself with straight arms.', 'Lower until your shoulders are below your elbows.', 'Press back up.'] },
  { name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'Cable machine', difficulty: 'beginner', instructions: ['Grip the bar wider than your shoulders.', 'Pull to your upper chest.', 'Control the weight back up.'] },
  { name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'Cable machine', difficulty: 'beginner', instructions: ['Sit tall with knees slightly bent.', 'Pull the handle to your belly button.', 'Squeeze your shoulder blades together.'] },
  { name: 'Face Pull', muscleGroup: 'shoulders', equipment: 'Cable machine', difficulty: 'beginner', instructions: ['Set the cable at face height.', 'Pull the rope toward your forehead.', 'Keep elbows high and squeeze the rear delts.'] },
  { name: 'Goblet Squat', muscleGroup: 'legs', equipment: 'Dumbbell', difficulty: 'beginner', instructions: ['Hold a dumbbell at your chest.', 'Squat down keeping your chest tall.', 'Drive through your heels.'] },
  { name: 'Treadmill Run', muscleGroup: 'cardio', equipment: 'Treadmill', difficulty: 'beginner', instructions: ['Warm up with a brisk walk.', 'Run at a pace you can hold for the full set.', 'Cool down with a slow walk.'] },
  { name: 'Rowing Machine', muscleGroup: 'cardio', equipment: 'Rower', difficulty: 'beginner', instructions: ['Push with your legs first.', 'Lean back slightly, then pull the handle.', 'Return arms, then body, then legs.'] },
  { name: 'Burpee', muscleGroup: 'full-body', equipment: 'Bodyweight', difficulty: 'intermediate', instructions: ['Drop into a squat and place hands on the floor.', 'Jump back to a plank, then forward again.', 'Jump up with arms overhead.'] },
];

// Sets are {reps, weight}. A weight of 0 means bodyweight.
function sets(spec) {
  return spec.map(([reps, weight]) => ({ reps, weight, completed: true }));
}

async function seed() {
  const userCount = await User.countDocuments();
  if (userCount > 0) return;

  const passwordHash = await bcrypt.hash('PulseFit123!', 10);
  const [member, trainer, admin] = await User.create([
    { name: 'Demo Member', email: 'demo@pulsefit.example', passwordHash, role: 'member', goal: 'strength', experienceLevel: 'intermediate' },
    { name: 'Demo Trainer', email: 'demo-trainer@pulsefit.example', passwordHash, role: 'trainer', goal: 'strength', experienceLevel: 'advanced' },
    { name: 'Admin', email: 'admin@pulsefit.example', passwordHash, role: 'admin', goal: 'general', experienceLevel: 'advanced' },
  ]);

  const exerciseDocs = await Exercise.insertMany(
    EXERCISES.map((e) => ({ ...e, isSample: true }))
  );
  const byName = new Map(exerciseDocs.map((e) => [e.name, e._id]));

  const [fullBody, pushDay, legDay] = await Template.create([
    {
      user: member._id,
      name: 'Full-Body Strength A',
      description: 'Three big lifts plus a core finisher. A balanced full-body day.',
      isSample: true,
      items: [
        { exercise: byName.get('Barbell Back Squat'), targetSets: 4, targetReps: 5, targetWeight: 95, order: 0 },
        { exercise: byName.get('Bench Press'), targetSets: 4, targetReps: 5, targetWeight: 70, order: 1 },
        { exercise: byName.get('Bent-Over Barbell Row'), targetSets: 4, targetReps: 8, targetWeight: 60, order: 2 },
        { exercise: byName.get('Plank'), targetSets: 3, targetReps: 60, targetWeight: 0, order: 3, notes: 'Hold 60 seconds per set' },
      ],
    },
    {
      user: member._id,
      name: 'Push Day',
      description: 'Chest, shoulders and triceps.',
      isSample: true,
      items: [
        { exercise: byName.get('Bench Press'), targetSets: 4, targetReps: 6, targetWeight: 70, order: 0 },
        { exercise: byName.get('Overhead Press'), targetSets: 4, targetReps: 6, targetWeight: 45, order: 1 },
        { exercise: byName.get('Incline Dumbbell Press'), targetSets: 3, targetReps: 10, targetWeight: 22, order: 2 },
        { exercise: byName.get('Lateral Raise'), targetSets: 3, targetReps: 12, targetWeight: 8, order: 3 },
        { exercise: byName.get('Triceps Rope Pushdown'), targetSets: 3, targetReps: 12, targetWeight: 25, order: 4 },
      ],
    },
    {
      user: trainer._id,
      name: 'Leg Day — Trainer Edition',
      description: 'A trainer-built leg session. Duplicate it to make it your own.',
      isPublic: true,
      isSample: true,
      items: [
        { exercise: byName.get('Barbell Back Squat'), targetSets: 4, targetReps: 5, targetWeight: 90, order: 0 },
        { exercise: byName.get('Leg Press'), targetSets: 3, targetReps: 10, targetWeight: 160, order: 1 },
        { exercise: byName.get('Romanian Deadlift'), targetSets: 3, targetReps: 8, targetWeight: 80, order: 2 },
        { exercise: byName.get('Leg Curl'), targetSets: 3, targetReps: 12, targetWeight: 40, order: 3 },
        { exercise: byName.get('Standing Calf Raise'), targetSets: 4, targetReps: 15, targetWeight: 60, order: 4 },
      ],
    },
  ]);

  // Completed sessions for the demo member across the last three weeks,
  // showing steady progression on the big lifts.
  const sessionSpecs = [
    { name: 'Full-Body Strength A', template: fullBody._id, startedDaysAgo: 19, duration: 52 * 60, exercises: [
      { exercise: 'Barbell Back Squat', sets: sets([[5, 85], [5, 85], [5, 85], [5, 85]]) },
      { exercise: 'Bench Press', sets: sets([[5, 65], [5, 65], [5, 65], [5, 65]]) },
      { exercise: 'Bent-Over Barbell Row', sets: sets([[8, 55], [8, 55], [8, 55], [8, 55]]) },
      { exercise: 'Plank', sets: sets([[60, 0], [60, 0], [45, 0]]) },
    ] },
    { name: 'Push Day', template: pushDay._id, startedDaysAgo: 17, duration: 48 * 60, exercises: [
      { exercise: 'Bench Press', sets: sets([[6, 65], [6, 65], [6, 65], [6, 65]]) },
      { exercise: 'Overhead Press', sets: sets([[6, 40], [6, 40], [6, 40], [5, 40]]) },
      { exercise: 'Incline Dumbbell Press', sets: sets([[10, 20], [10, 20], [10, 20]]) },
      { exercise: 'Triceps Rope Pushdown', sets: sets([[12, 22.5], [12, 22.5], [12, 22.5]]) },
    ] },
    { name: 'Leg Day — Trainer Edition', template: legDay._id, startedDaysAgo: 15, duration: 55 * 60, exercises: [
      { exercise: 'Barbell Back Squat', sets: sets([[5, 90], [5, 90], [5, 90], [5, 90]]) },
      { exercise: 'Leg Press', sets: sets([[10, 150], [10, 150], [10, 150]]) },
      { exercise: 'Romanian Deadlift', sets: sets([[8, 75], [8, 75], [8, 75]]) },
      { exercise: 'Leg Curl', sets: sets([[12, 35], [12, 35], [12, 35]]) },
    ] },
    { name: 'Full-Body Strength A', template: fullBody._id, startedDaysAgo: 12, duration: 54 * 60, exercises: [
      { exercise: 'Barbell Back Squat', sets: sets([[5, 90], [5, 90], [5, 90], [5, 90]]) },
      { exercise: 'Bench Press', sets: sets([[5, 67.5], [5, 67.5], [5, 67.5], [5, 67.5]]) },
      { exercise: 'Bent-Over Barbell Row', sets: sets([[8, 57.5], [8, 57.5], [8, 57.5], [8, 57.5]]) },
      { exercise: 'Plank', sets: sets([[60, 0], [60, 0], [60, 0]]) },
    ] },
    { name: 'Push Day', template: pushDay._id, startedDaysAgo: 10, duration: 49 * 60, exercises: [
      { exercise: 'Bench Press', sets: sets([[6, 67.5], [6, 67.5], [6, 67.5], [6, 67.5]]) },
      { exercise: 'Overhead Press', sets: sets([[6, 42.5], [6, 42.5], [6, 42.5], [6, 42.5]]) },
      { exercise: 'Incline Dumbbell Press', sets: sets([[10, 22], [10, 22], [10, 22]]) },
      { exercise: 'Lateral Raise', sets: sets([[12, 7.5], [12, 7.5], [12, 7.5]]) },
      { exercise: 'Triceps Rope Pushdown', sets: sets([[12, 25], [12, 25], [12, 25]]) },
    ] },
    { name: 'Leg Day — Trainer Edition', template: legDay._id, startedDaysAgo: 8, duration: 57 * 60, exercises: [
      { exercise: 'Barbell Back Squat', sets: sets([[5, 95], [5, 95], [5, 95], [5, 95]]) },
      { exercise: 'Leg Press', sets: sets([[10, 160], [10, 160], [10, 160]]) },
      { exercise: 'Romanian Deadlift', sets: sets([[8, 80], [8, 80], [8, 80]]) },
      { exercise: 'Leg Curl', sets: sets([[12, 40], [12, 40], [12, 40]]) },
      { exercise: 'Standing Calf Raise', sets: sets([[15, 60], [15, 60], [15, 60], [15, 60]]) },
    ] },
    { name: 'Full-Body Strength A', template: fullBody._id, startedDaysAgo: 5, duration: 56 * 60, exercises: [
      { exercise: 'Barbell Back Squat', sets: sets([[5, 95], [5, 95], [5, 95], [5, 95]]) },
      { exercise: 'Bench Press', sets: sets([[5, 70], [5, 70], [5, 70], [5, 70]]) },
      { exercise: 'Bent-Over Barbell Row', sets: sets([[8, 60], [8, 60], [8, 60], [8, 60]]) },
      { exercise: 'Plank', sets: sets([[60, 0], [60, 0], [60, 0]]) },
    ] },
    { name: 'Push Day', template: pushDay._id, startedDaysAgo: 3, duration: 50 * 60, exercises: [
      { exercise: 'Bench Press', sets: sets([[6, 70], [6, 70], [6, 70], [6, 70]]) },
      { exercise: 'Overhead Press', sets: sets([[6, 45], [6, 45], [6, 45], [6, 45]]) },
      { exercise: 'Incline Dumbbell Press', sets: sets([[10, 22], [10, 22], [10, 22]]) },
      { exercise: 'Lateral Raise', sets: sets([[12, 8], [12, 8], [12, 8]]) },
      { exercise: 'Triceps Rope Pushdown', sets: sets([[12, 25], [12, 25], [12, 25]]) },
    ] },
    { name: 'Leg Day — Trainer Edition', template: legDay._id, startedDaysAgo: 1, duration: 58 * 60, exercises: [
      { exercise: 'Barbell Back Squat', sets: sets([[5, 100], [5, 100], [5, 100], [5, 100]]) },
      { exercise: 'Leg Press', sets: sets([[10, 170], [10, 170], [10, 170]]) },
      { exercise: 'Romanian Deadlift', sets: sets([[8, 85], [8, 85], [8, 85]]) },
      { exercise: 'Leg Curl', sets: sets([[12, 40], [12, 40], [12, 40]]) },
      { exercise: 'Standing Calf Raise', sets: sets([[15, 65], [15, 65], [15, 65], [15, 65]]) },
    ] },
  ];

  const createdSessions = [];
  for (const spec of sessionSpecs) {
    const startedAt = daysAgo(spec.startedDaysAgo);
    const finishedAt = new Date(startedAt.getTime() + spec.duration * 1000);
    const session = {
      user: member._id,
      template: spec.template,
      name: spec.name,
      status: 'completed',
      startedAt,
      finishedAt,
      durationSeconds: spec.duration,
      isSample: true,
      exercises: spec.exercises.map((ex) => ({
        exercise: byName.get(ex.exercise),
        sets: ex.sets,
      })),
    };
    session.totalVolume = sessionVolume(session);
    createdSessions.push(await Session.create(session));
  }

  // Personal records derived from the seeded sessions.
  const bestByExercise = new Map();
  for (const session of createdSessions) {
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (set.weight <= 0) continue;
        const key = String(ex.exercise);
        const current = bestByExercise.get(key);
        const candidateMax = epleyOneRepMax(set.weight, set.reps);
        if (!current || candidateMax > current.estimatedOneRepMax) {
          bestByExercise.set(key, {
            bestWeight: set.weight,
            bestReps: set.reps,
            estimatedOneRepMax: candidateMax,
            achievedAt: session.finishedAt,
            session: session._id,
          });
        }
      }
    }
  }
  for (const [exerciseId, record] of bestByExercise) {
    await PersonalRecord.create({ user: member._id, exercise: exerciseId, ...record });
  }

  const now = new Date();
  const challengeStart = new Date(now.getTime() - 2 * DAY);
  const volumeChallenge = await Challenge.create({
    title: 'November Volume Push',
    description: 'Lift a combined 20,000 kg across your sessions this week.',
    type: 'volume',
    target: 20000,
    unit: 'kg',
    startsAt: challengeStart,
    endsAt: new Date(now.getTime() + 5 * DAY),
    createdBy: trainer._id,
    isSample: true,
    participants: [{ user: member._id, progress: 0 }],
  });
  await Challenge.create({
    title: 'Three Sessions a Week',
    description: 'Complete three training sessions before the week ends.',
    type: 'sessions',
    target: 3,
    unit: 'sessions',
    startsAt: challengeStart,
    endsAt: new Date(now.getTime() + 5 * DAY),
    createdBy: trainer._id,
    isSample: true,
    participants: [{ user: member._id, progress: 0 }],
  });

  // Bring the demo member's challenge progress in line with the seeded
  // sessions that fall inside each challenge window.
  for (const challenge of [volumeChallenge]) {
    const inWindow = createdSessions.filter(
      (s) => s.finishedAt >= challenge.startsAt && s.finishedAt <= challenge.endsAt
    );
    const progress = inWindow.reduce((sum, s) => sum + (s.totalVolume || 0), 0);
    challenge.participants[0].progress = progress;
    await challenge.save();
  }
  const sessionChallenge = await Challenge.findOne({ title: 'Three Sessions a Week' });
  const inWindowSessions = createdSessions.filter(
    (s) => s.finishedAt >= sessionChallenge.startsAt && s.finishedAt <= sessionChallenge.endsAt
  );
  sessionChallenge.participants[0].progress = inWindowSessions.length;
  await sessionChallenge.save();

  await Plan.create({
    trainer: trainer._id,
    title: '8-Week Strength Foundation',
    description: 'Three full-body days a week, adding a little weight each session. Built for the demo member.',
    isSample: true,
    weeks: [
      { weekNumber: 1, templateIds: [fullBody._id, pushDay._id, legDay._id] },
      { weekNumber: 2, templateIds: [fullBody._id, pushDay._id, legDay._id] },
    ],
    assignedTo: [member._id],
    status: 'active',
  });

  console.log('PulseFit seed complete');
}

module.exports = seed;
