import React, { useMemo, useState } from 'react';
import { Database, Plus, RotateCcw, Search, Shuffle, Trash2 } from 'lucide-react';

type CollisionStrategy = 'chaining' | 'linear';
type Operation = 'insert' | 'search' | 'delete';
interface Entry { key: string; value: string }
interface Slot { entries: Entry[]; tombstone: boolean }

const emptyTable = (size: number): Slot[] =>
  Array.from({ length: size }, () => ({ entries: [], tombstone: false }));

const hashKey = (key: string) => Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0);

const cloneTable = (table: Slot[]) => table.map((slot) => ({
  entries: slot.entries.map((entry) => ({ ...entry })),
  tombstone: slot.tombstone,
}));

export const HashTablePlayground: React.FC = () => {
  const [bucketCount, setBucketCount] = useState(7);
  const [strategy, setStrategy] = useState<CollisionStrategy>('chaining');
  const [table, setTable] = useState<Slot[]>(() => emptyTable(7));
  const [key, setKey] = useState('cat');
  const [value, setValue] = useState('mammal');
  const [visitedSlots, setVisitedSlots] = useState<number[]>([]);
  const [lastHash, setLastHash] = useState<number | null>(null);
  const [lastKey, setLastKey] = useState('');
  const [lastMessage, setLastMessage] = useState('Insert a key, then watch its hash choose a bucket.');
  const [collisionCount, setCollisionCount] = useState(0);

  const entryCount = useMemo(() => table.reduce((sum, slot) => sum + slot.entries.length, 0), [table]);
  const baseIndex = lastHash === null ? null : lastHash % bucketCount;

  const clearTable = (message = 'Table cleared. Add a key to see its bucket.') => {
    setTable(emptyTable(bucketCount));
    setVisitedSlots([]);
    setLastHash(null);
    setLastKey('');
    setCollisionCount(0);
    setLastMessage(message);
  };

  const runOperation = (operation: Operation) => {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      setLastMessage('Enter a key first.');
      return;
    }
    if (operation === 'insert' && !value.trim()) {
      setLastMessage('Enter a value to insert.');
      return;
    }

    const rawHash = hashKey(normalizedKey);
    const start = rawHash % bucketCount;
    const next = cloneTable(table);
    const visited: number[] = [];
    let message = '';
    let foundIndex = -1;
    let insertIndex = -1;

    if (strategy === 'chaining') {
      visited.push(start);
      const bucket = next[start];
      const existing = bucket.entries.find((entry) => entry.key === normalizedKey);
      if (operation === 'insert') {
        if (existing) {
          existing.value = value.trim();
          message = `Updated “${normalizedKey}” in bucket ${start}.`;
        } else {
          if (bucket.entries.length > 0) setCollisionCount((count) => count + 1);
          bucket.entries.push({ key: normalizedKey, value: value.trim() });
          message = bucket.entries.length > 1
            ? `Collision at bucket ${start}; chaining stores both keys in this bucket.`
            : `Inserted “${normalizedKey}” in bucket ${start}.`;
        }
      } else {
        foundIndex = bucket.entries.findIndex((entry) => entry.key === normalizedKey);
        if (operation === 'search') {
          message = foundIndex >= 0
            ? `Found “${normalizedKey}” → ${bucket.entries[foundIndex].value} in bucket ${start}.`
            : `“${normalizedKey}” is not in bucket ${start}.`;
        } else if (foundIndex >= 0) {
          bucket.entries.splice(foundIndex, 1);
          message = `Deleted “${normalizedKey}” from bucket ${start}.`;
        } else {
          message = `Could not delete “${normalizedKey}”; it is not in bucket ${start}.`;
        }
      }
    } else {
      let firstTombstone = -1;
      for (let offset = 0; offset < bucketCount; offset += 1) {
        const index = (start + offset) % bucketCount;
        const slot = next[index];
        visited.push(index);

        if (slot.entries[0]?.key === normalizedKey) {
          foundIndex = index;
          break;
        }
        if (slot.tombstone && firstTombstone < 0) firstTombstone = index;
        if (slot.entries.length === 0 && !slot.tombstone) {
          insertIndex = firstTombstone >= 0 ? firstTombstone : index;
          break;
        }
      }

      if (operation === 'insert') {
        if (foundIndex >= 0) {
          next[foundIndex].entries[0].value = value.trim();
          message = `Updated “${normalizedKey}” in slot ${foundIndex}.`;
        } else {
          const target = insertIndex >= 0 ? insertIndex : firstTombstone;
          if (target < 0) {
            message = 'The table is full. Delete a key or increase the bucket count.';
          } else {
            if (visited.length > 1) setCollisionCount((count) => count + 1);
            next[target] = { entries: [{ key: normalizedKey, value: value.trim() }], tombstone: false };
            message = target === start
              ? `Inserted “${normalizedKey}” in its home slot ${target}.`
              : `Collision at ${start}; linear probing found the next available slot ${target}.`;
          }
        }
      } else if (foundIndex >= 0) {
        if (operation === 'search') {
          message = `Found “${normalizedKey}” → ${next[foundIndex].entries[0].value} in slot ${foundIndex}.`;
        } else {
          next[foundIndex] = { entries: [], tombstone: true };
          message = `Deleted “${normalizedKey}” from slot ${foundIndex}. The slot stays marked so later searches still work.`;
        }
      } else {
        message = operation === 'search'
          ? `“${normalizedKey}” was not found after checking ${visited.length} slot${visited.length === 1 ? '' : 's'}.`
          : `Could not delete “${normalizedKey}”; it was not found.`;
      }
    }

    setTable(next);
    setVisitedSlots(visited);
    setLastHash(rawHash);
    setLastKey(normalizedKey);
    setLastMessage(message);
  };

  const loadCollisionSample = () => {
    const sample: Entry[] = [
      { key: 'cat', value: 'mammal' },
      { key: 'act', value: 'verb' },
      { key: 'tac', value: 'anagram' },
      { key: 'dog', value: 'mammal' },
    ];
    const next = emptyTable(bucketCount);
    let collisions = 0;

    sample.forEach((entry) => {
      const start = hashKey(entry.key) % bucketCount;
      if (strategy === 'chaining') {
        if (next[start].entries.length > 0) collisions += 1;
        next[start].entries.push(entry);
      } else {
        for (let offset = 0; offset < bucketCount; offset += 1) {
          const index = (start + offset) % bucketCount;
          if (next[index].entries.length === 0) {
            if (offset > 0) collisions += 1;
            next[index].entries.push(entry);
            break;
          }
        }
      }
    });

    setTable(next);
    setCollisionCount(collisions);
    setVisitedSlots([]);
    setLastHash(null);
    setLastKey('');
    setLastMessage('Sample loaded: cat, act and tac share the same home bucket, so you can compare both collision strategies.');
  };

  const changeBucketCount = (nextCount: number) => {
    setBucketCount(nextCount);
    setTable(emptyTable(nextCount));
    setVisitedSlots([]);
    setLastHash(null);
    setLastKey('');
    setCollisionCount(0);
    setLastMessage(`Started a fresh ${nextCount}-bucket table.`);
  };

  const changeStrategy = (nextStrategy: CollisionStrategy) => {
    setStrategy(nextStrategy);
    setTable(emptyTable(bucketCount));
    setVisitedSlots([]);
    setLastHash(null);
    setLastKey('');
    setCollisionCount(0);
    setLastMessage('Started a fresh table so you can compare collision strategies fairly.');
  };

  return (
    <section className="hash-lab" aria-labelledby="hash-lab-title">
      <header className="hash-lab-header">
        <div className="hash-lab-title-group">
          <span className="hash-lab-icon"><Database size={20} aria-hidden="true" /></span>
          <div>
            <p className="hash-lab-kicker">Hands-on hash table</p>
            <h2 id="hash-lab-title">Build it. Collide it. Find it.</h2>
            <p>Choose a key and watch the hash function route it into the table.</p>
          </div>
        </div>
        <div className="hash-lab-settings">
          <label>
            <span>Buckets</span>
            <select value={bucketCount} onChange={(event) => changeBucketCount(Number(event.target.value))}>
              {[5, 7, 11].map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
          <label>
            <span>Collision rule</span>
            <select value={strategy} onChange={(event) => changeStrategy(event.target.value as CollisionStrategy)}>
              <option value="chaining">Separate chaining</option>
              <option value="linear">Linear probing</option>
            </select>
          </label>
        </div>
      </header>

      <div className="hash-lab-controls">
        <form className="hash-lab-form" onSubmit={(event) => { event.preventDefault(); runOperation('search'); }}>
          <label>
            <span>Key</span>
            <input value={key} onChange={(event) => setKey(event.target.value)} placeholder="e.g. cat" maxLength={18} />
          </label>
          <label>
            <span>Value</span>
            <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="e.g. mammal" maxLength={24} />
          </label>
          <div className="hash-lab-operations" aria-label="Hash table operations">
            <button type="button" className="hash-lab-action hash-lab-insert" onClick={() => runOperation('insert')}>
              <Plus size={15} aria-hidden="true" /> Insert / Update
            </button>
            <button type="button" className="hash-lab-action" onClick={() => runOperation('search')}>
              <Search size={15} aria-hidden="true" /> Search
            </button>
            <button type="button" className="hash-lab-action hash-lab-delete" onClick={() => runOperation('delete')}>
              <Trash2 size={15} aria-hidden="true" /> Delete
            </button>
          </div>
        </form>
        <div className="hash-lab-secondary-actions">
          <button type="button" onClick={loadCollisionSample}><Shuffle size={14} aria-hidden="true" /> Collision sample</button>
          <button type="button" onClick={() => clearTable()}><RotateCcw size={14} aria-hidden="true" /> Clear table</button>
        </div>
      </div>

      <div className="hash-lab-explainer" aria-live="polite">
        <div className="hash-lab-status"><span className="hash-lab-status-dot" />{lastMessage}</div>
        {lastHash !== null && baseIndex !== null && (
          <div className="hash-lab-formula">
            <code>h("{lastKey}") = {lastHash}</code>
            <span>→</span>
            <code>{lastHash} mod {bucketCount} = {baseIndex}</code>
            <span className="hash-lab-probe-count">{visitedSlots.length} slot{visitedSlots.length === 1 ? '' : 's'} checked</span>
          </div>
        )}
      </div>

      <div className="hash-lab-summary">
        <span><strong>{entryCount}</strong> / {bucketCount} entries · load factor {(entryCount / bucketCount).toFixed(2)}</span>
        <span><strong>{collisionCount}</strong> collision{collisionCount === 1 ? '' : 's'} during inserts</span>
      </div>

      <div className={`hash-lab-buckets ${strategy === 'linear' ? 'is-linear' : ''}`} aria-label={`${bucketCount} hash table buckets using ${strategy === 'linear' ? 'linear probing' : 'separate chaining'}`}>
        {table.map((slot, index) => {
          const isHome = index === baseIndex;
          const isVisited = visitedSlots.includes(index);
          return (
            <div key={index} className={`hash-lab-bucket${isHome ? ' is-home' : ''}${isVisited ? ' is-visited' : ''}`}>
              <span className="hash-lab-index">{index}</span>
              <div className="hash-lab-slot-content">
                {slot.entries.length > 0 ? slot.entries.map((entry) => (
                  <span className="hash-lab-entry" key={entry.key}>
                    <strong>{entry.key}</strong><i>→</i>{entry.value}
                  </span>
                )) : slot.tombstone ? (
                  <span className="hash-lab-tombstone">DELETED · probe continues</span>
                ) : (
                  <span className="hash-lab-empty-slot">empty</span>
                )}
              </div>
              <span className="hash-lab-slot-state">{isHome ? 'HOME' : isVisited ? 'CHECKED' : ''}</span>
            </div>
          );
        })}
      </div>

      <p className="hash-lab-footnote">
        This teaching hash adds each character code, then takes the remainder. Real language hash maps use different hash functions.
        {strategy === 'chaining' ? ' Separate chaining keeps colliding entries together in one bucket.' : ' Linear probing checks the next bucket until it finds the key or an empty slot.'}
      </p>
    </section>
  );
};
