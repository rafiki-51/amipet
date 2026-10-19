import test from 'node:test';
import assert from 'node:assert/strict';
import { USER, OTHER, PET, RECORD, NOW, fixture, form, actionModule, redirected, assertScope } from './helpers/scenario.mjs';

const root = '/mi-cuenta/mascotas';
const modules = [
  { name: 'pets', table: 'pets', create: 'createPet', update: 'updatePet', fields: { name: ' Synthetic pet ', species: 'dog', sex: 'unknown', weight: '0' }, path: root },
  { name: 'pet-weight-logs', table: 'pet_weight_logs', create: 'createPetWeightLog', update: 'updatePetWeightLog', remove: 'deletePetWeightLog', fields: { weight: '2.50', measured_at: '2025-03-01' }, path: root + '/' + PET + '/peso' },
  { name: 'pet-vaccinations', table: 'pet_vaccinations', create: 'createPetVaccination', update: 'updatePetVaccination', remove: 'deletePetVaccination', fields: { vaccine_name: 'Synthetic vaccine', administered_at: '2025-03-01', status: 'applied' }, path: root + '/' + PET + '/vacunas', state: { status: 'scheduled' } },
  { name: 'pet-reminders', table: 'pet_reminders', create: 'createPetReminder', update: 'updatePetReminder', remove: 'deletePetReminder', fields: { title: 'Synthetic reminder', reminder_type: 'other', due_at: '2025-03-01', status: 'pending', source: 'manual' }, path: root + '/' + PET + '/recordatorios', state: { status: 'completed', source: 'manual', related_vaccination_id: null } },
  { name: 'pet-medications', table: 'pet_medications', create: 'createPetMedication', update: 'updatePetMedication', remove: 'deletePetMedication', fields: { medication_name: 'Synthetic medicine', medication_type: 'medication', start_date: '2025-03-01', status: 'active' }, path: root + '/' + PET + '/medicamentos', state: { status: 'paused' } },
  { name: 'pet-medical-records', table: 'pet_medical_records', create: 'createPetMedicalRecord', update: 'updatePetMedicalRecord', remove: 'deletePetMedicalRecord', fields: { title: 'Synthetic consultation', record_type: 'consultation', occurred_at: '2025-03-01' }, path: root + '/' + PET + '/historial-medico' },
];

function setup(spec, { pet = {}, record = {}, ...options } = {}) {
  const tables = { pets: [{ id: PET, user_id: USER, archived_at: null, ...pet }] };
  if (spec.table !== 'pets') tables[spec.table] = [{ id: RECORD, pet_id: PET, user_id: USER, ...spec.fields, ...spec.state, ...record }];
  const db = fixture({ ...options, tables });
  return { db, actions: actionModule('src/actions/' + spec.name + '.ts', db) };
}
const create = (spec, actions, fields = spec.fields) => spec.table === 'pets'
  ? actions[spec.create](form(fields)) : actions[spec.create](PET, form(fields));
const update = (spec, actions, fields = spec.fields) => spec.table === 'pets'
  ? actions[spec.update](PET, form(fields)) : actions[spec.update](PET, RECORD, form(fields));
function scopes(spec, db) {
  for (const q of db.queries.filter(q => q.table !== 'profiles' && q.op !== 'insert')) {
    assertScope(q, q.table, q.table === 'pets' ? PET : RECORD, q.table === 'pets' ? null : PET);
  }
}

for (const spec of modules) {
  test(spec.name + ': create valid synthetic data with authenticated owner', async () => {
    const { db, actions } = setup(spec);
    await redirected(() => create(spec, actions), spec.path);
    assert.equal(db.committed.length, 1);
    const q = db.committed[0];
    assert.equal(q.table, spec.table); assert.equal(q.op, 'insert'); assert.equal(q.payload.user_id, USER);
    if (spec.table !== 'pets') assert.equal(q.payload.pet_id, PET);
    else { assert.equal(q.payload.name, 'Synthetic pet'); assert.equal(q.payload.weight, 0); }
    scopes(spec, db);
  });
  test(spec.name + ': missing required data never writes', async () => {
    const { db, actions } = setup(spec);
    await redirected(() => create(spec, actions, {}), /[?]error=required$/);
    assert.equal(db.mutations.length, 0);
  });
  test(spec.name + ': edit filters owner and preserves protected state', async () => {
    const { db, actions } = setup(spec);
    await redirected(() => update(spec, actions), spec.table === 'pets' ? root + '/' + PET : spec.path);
    assert.equal(db.committed.length, 1); assert.equal(db.committed[0].op, 'update');
    scopes(spec, db);
    if (spec.state) for (const [key, value] of Object.entries(spec.state)) assert.equal(db.committed[0].payload[key], value);
  });
  test(spec.name + ': another customer cannot edit the pet', async () => {
    const { db, actions } = setup(spec, { pet: { user_id: OTHER } });
    await redirected(() => update(spec, actions), root);
    assert.equal(db.mutations.length, 0); scopes(spec, db);
  });
  test(spec.name + ': archived pet cannot be edited', async () => {
    const { db, actions } = setup(spec, { pet: { archived_at: NOW } });
    await redirected(() => update(spec, actions), spec.table === 'pets' ? root + '/' + PET : /[?]error=archived$/);
    assert.equal(db.mutations.length, 0); scopes(spec, db);
  });
  for (const [name, options] of [['anonymous', { user: null }], ['admin', { role: 'admin' }], ['operator', { role: 'operator' }], ['missing profile', { profileMissing: true }], ['profile query error', { fail: q => q.table === 'profiles' }]]) {
    test(spec.name + ': create denies ' + name, async () => {
      const { db, actions } = setup(spec, options);
      await redirected(() => create(spec, actions), /login|admin\/pedidos|error=profile/);
      assert.equal(db.mutations.length, 0);
    });
  }
  test(spec.name + ': insert failure returns save error without committing', async () => {
    const { db, actions } = setup(spec, { fail: q => q.op === 'insert' });
    await redirected(() => create(spec, actions), /[?]error=save$/);
    assert.equal(db.committed.length, 0); assert.equal(db.mutations.length, 1);
  });
  test(spec.name + ': owner lookup failure never writes', async () => {
    const { db, actions } = setup(spec, { fail: q => q.table === 'pets' });
    await redirected(() => update(spec, actions), /[?]error=save$/);
    assert.equal(db.mutations.length, 0);
  });
  test(spec.name + ': update write error is not treated as success', async () => {
    const { db, actions } = setup(spec, { fail: q => q.op === 'update' });
    await redirected(() => update(spec, actions), /[?]error=save$/);
    assert.equal(db.committed.length, 0); scopes(spec, db);
  });
  if (spec.table !== 'pets') {
    test(spec.name + ': archived or foreign pet cannot receive new records', async () => {
      for (const pet of [{ archived_at: NOW }, { user_id: OTHER }]) {
        const { db, actions } = setup(spec, { pet });
        await redirected(() => create(spec, actions), pet.archived_at ? /error=archived$/ : root);
        assert.equal(db.mutations.length, 0); scopes(spec, db);
      }
    });
    for (const record of [{ user_id: OTHER }, { pet_id: 'another-owned-pet' }]) test(spec.name + ': record owner/pet mismatch ' + Object.keys(record)[0], async () => {
      const { db, actions } = setup(spec, { record });
      await redirected(() => update(spec, actions), spec.path);
      assert.equal(db.mutations.length, 0); scopes(spec, db);
    });
    test(spec.name + ': delete owner record with all three scope filters', async () => {
      const { db, actions } = setup(spec);
      await redirected(() => actions[spec.remove](PET, RECORD), spec.path);
      assert.equal(db.committed.length, 1); assert.equal(db.committed[0].op, 'delete'); scopes(spec, db);
    });
    test(spec.name + ': delete foreign or archived record never writes', async () => {
      for (const options of [{ record: { user_id: OTHER } }, { pet: { archived_at: NOW } }]) {
        const { db, actions } = setup(spec, options);
        await redirected(() => actions[spec.remove](PET, RECORD), /error=(delete|archived)$/);
        assert.equal(db.mutations.length, 0); scopes(spec, db);
      }
    });
    test(spec.name + ': delete error is returned without committing', async () => {
      const { db, actions } = setup(spec, { fail: q => q.op === 'delete' });
      await redirected(() => actions[spec.remove](PET, RECORD), /error=delete$/);
      assert.equal(db.committed.length, 0); scopes(spec, db);
    });
  }
}

const invalids = [
  [0, { sex: 'invalid' }, 'sex'], [0, { weight: '-1' }, 'weight'],
  [1, { weight: '0' }, 'weight'], [1, { weight: '-1' }, 'weight'], [1, { weight: 'NaN' }, 'weight'],
  [1, { measured_at: '2025-02-30' }, 'date'], [1, { measured_at: '2025-03-16' }, 'date'],
  [2, { administered_at: '2025-03-16' }, 'future-date'], [2, { next_due_at: '2025-02-28' }, 'next-due-date'], [2, { status: 'invalid' }, 'status'],
  [3, { reminder_type: 'invalid' }, 'type'], [3, { due_at: '2025-02-30' }, 'date'], [3, { source: 'vaccination' }, 'vaccination'],
  [4, { medication_type: 'invalid' }, 'type'], [4, { end_date: '2025-02-28' }, 'end-date'],
  [5, { record_type: 'invalid' }, 'type'], [5, { occurred_at: '2025-03-16' }, 'future-date'],
];
for (const [index, patch, error] of invalids) test(modules[index].name + ': invalid ' + JSON.stringify(patch), async () => {
  const spec = modules[index], { db, actions } = setup(spec);
  await redirected(() => create(spec, actions, { ...spec.fields, ...patch }), new RegExp('error=' + error + '$'));
  assert.equal(db.mutations.length, 0);
});

test('reminder rejects related vaccination belonging to another user', async () => {
  const spec = modules[3], db = fixture({ tables: { pets: [{ id: PET, user_id: USER, archived_at: null }], pet_reminders: [], pet_vaccinations: [{ id: RECORD, pet_id: PET, user_id: OTHER }] } });
  const actions = actionModule('src/actions/pet-reminders.ts', db);
  await redirected(() => create(spec, actions, { ...spec.fields, source: 'vaccination', related_vaccination_id: RECORD }), /error=vaccination$/);
  assert.equal(db.mutations.length, 0);
  assertScope(db.queries.find(q => q.table === 'pet_vaccinations'), 'pet_vaccinations', RECORD, PET);
});
test('archivePet scopes update and retains data instead of deleting', async () => {
  const { db, actions } = setup(modules[0]);
  await redirected(() => actions.archivePet(PET, form({ archived_reason: 'Synthetic reason' })), root);
  assert.equal(db.committed.length, 1); assertScope(db.committed[0], 'pets', PET);
  assert.equal(db.rows.pets.length, 1); assert.equal(db.rows.pets[0].archived_at, NOW);
});
test('archivePet rejects a pet owned by another user', async () => {
  const { db, actions } = setup(modules[0], { pet: { user_id: OTHER } });
  await redirected(() => actions.archivePet(PET, form({})), root);
  assert.equal(db.mutations.length, 0);
});

const transitions = [
  [3, 'completePetReminder', 'pending', 'completed'], [3, 'reopenPetReminder', 'completed', 'pending'],
  [4, 'completePetMedication', 'active', 'completed'], [4, 'pausePetMedication', 'active', 'paused'], [4, 'reopenPetMedication', 'paused', 'active'],
];
for (const [index, action, initial, target] of transitions) {
  test(action + ': valid owned transition and scope', async () => {
    const spec = modules[index];
    // Preserve every previously accepted non-canceled source state, including
    // idempotent calls; QA-1C does not introduce a new general state machine.
    for (const source of new Set([initial, ...(index === 3 ? ['pending', 'completed'] : ['active', 'paused', 'completed'])])) {
      const { db, actions } = setup(spec, { record: { status: source } });
      await redirected(() => actions[action](PET, RECORD), spec.path);
      assert.equal(db.committed.length, 1); assert.equal(db.rows[spec.table][0].status, target); scopes(spec, db);
      assert.deepEqual(db.committed[0].notEquals, [['status', 'canceled']]);
      assert.equal(db.committed[0].columns, 'id');
      if (action === 'completePetReminder') assert.equal(db.rows[spec.table][0].completed_at, NOW);
      if (action === 'reopenPetReminder') assert.equal(db.rows[spec.table][0].completed_at, null);
    }
  });
  for (const [name, options] of [['foreign record', { record: { user_id: OTHER } }], ['archived pet', { pet: { archived_at: NOW } }]]) test(action + ': rejects ' + name, async () => {
    const { db, actions } = setup(modules[index], options);
    await redirected(() => actions[action](PET, RECORD), /error=(complete|pause|reopen|archived)$/);
    assert.equal(db.mutations.length, 0); scopes(modules[index], db);
  });
  // QA-1C explicitly establishes canceled as terminal for these five actions.
  test('SECURITY: ' + action + ' must not transition a canceled record via direct action', async () => {
    const { db, actions } = setup(modules[index], { record: { status: 'canceled' } });
    const before = structuredClone(db.rows);
    await redirected(() => actions[action](PET, RECORD), new RegExp('error=' + (action.startsWith('complete') ? 'complete' : action.startsWith('pause') ? 'pause' : 'reopen') + '$'));
    assert.equal(db.mutations.length, 0, 'Canceled record was mutated despite hidden UI action');
    assert.deepEqual(db.rows, before);
  });
  test(action + ': UPDATE excludes a cancellation after ownership read (simulated interleaving)', async () => {
    const spec = modules[index];
    const { db, actions } = setup(spec, { record: { status: initial, notes: 'Synthetic notes', completed_at: null }, beforeQuery: (q, rows) => {
      if (q.table === spec.table && q.op === 'update') rows[spec.table][0].status = 'canceled';
    } });
    const before = structuredClone(db.rows[spec.table][0]);
    await redirected(() => actions[action](PET, RECORD), /error=(complete|pause|reopen)$/);
    assert.equal(db.mutations.length, 1); assert.equal(db.committed.length, 0);
    assert.deepEqual(db.mutations[0].notEquals, [['status', 'canceled']]);
    assert.deepEqual(db.rows[spec.table][0], { ...before, status: 'canceled' });
    scopes(spec, db);
  });
  test(action + ': disappearing record returns existing controlled error', async () => {
    const spec = modules[index], { db, actions } = setup(spec, { record: { status: initial }, beforeQuery: (q, rows) => {
      if (q.table === spec.table && q.op === 'update') rows[spec.table] = [];
    } });
    await redirected(() => actions[action](PET, RECORD), /error=(complete|pause|reopen)$/);
    assert.equal(db.committed.length, 0); scopes(spec, db);
  });
  test(action + ': Supabase update failure returns controlled error without partial write', async () => {
    const spec = modules[index], { db, actions } = setup(spec, { record: { status: initial }, fail: q => q.table === spec.table && q.op === 'update' });
    const before = structuredClone(db.rows);
    await redirected(() => actions[action](PET, RECORD), /error=(complete|pause|reopen)$/);
    assert.equal(db.committed.length, 0); assert.deepEqual(db.rows, before); scopes(spec, db);
  });
  test(action + ': foreign pet is rejected before UPDATE', async () => {
    const { db, actions } = setup(modules[index], { pet: { user_id: OTHER } });
    await redirected(() => actions[action](PET, RECORD), /error=(complete|pause|reopen)$/);
    assert.equal(db.mutations.length, 0); scopes(modules[index], db);
  });
}
