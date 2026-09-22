const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "v"]);

export const ISSUE = {
  matched: "matched",
  numberMatchNameDiff: "number_match_name_diff",
  blankName: "blank_name",
  nameMatchNumberDiff: "name_match_number_diff",
  nearNumber: "near_number",
  possibleIdMismatch: "possible_id_mismatch",
  usersOnly: "users_only",
  facialOnly: "facial_only",
};

export const ISSUE_LABELS = {
  [ISSUE.matched]: "Emp. No. and names match",
  [ISSUE.numberMatchNameDiff]: "Same Emp. No., different name",
  [ISSUE.blankName]: "Same Emp. No., name missing",
  [ISSUE.nameMatchNumberDiff]: "Same name, different Emp. No.",
  [ISSUE.nearNumber]: "Leading zeros or spaces",
  [ISSUE.possibleIdMismatch]: "Possible Emp. No. mismatch",
  [ISSUE.usersOnly]: "Users List only",
  [ISSUE.facialOnly]: "AttendanceRecordInfo only",
};

const ISSUE_SORT = {
  [ISSUE.nameMatchNumberDiff]: 0,
  [ISSUE.possibleIdMismatch]: 1,
  [ISSUE.nearNumber]: 2,
  [ISSUE.usersOnly]: 3,
  [ISSUE.facialOnly]: 4,
  [ISSUE.numberMatchNameDiff]: 5,
  [ISSUE.blankName]: 6,
  [ISSUE.matched]: 7,
};

function trimText(value) {
  return String(value ?? "").trim();
}

export function usersListName(user) {
  const full = trimText(user?.fullName);
  if (full && full.toLowerCase() !== "username") return full;
  const fromParts = [
    user?.lastName,
    user?.firstName,
    user?.middleName,
    user?.nameExtension,
  ]
    .map((part) => trimText(part))
    .filter(Boolean);
  if (fromParts.length >= 2 && user?.lastName) {
    const last = trimText(user.lastName);
    const given = [user?.firstName, user?.middleName, user?.nameExtension]
      .map((part) => trimText(part))
      .filter(Boolean)
      .join(" ");
    return given ? `${last}, ${given}` : last;
  }
  return fromParts.join(" ");
}

function nameTokens(name) {
  return trimText(name)
    .toLowerCase()
    .replace(/[.,/'"`()*#-]/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .filter((token) => token && token.length > 1 && !SUFFIXES.has(token));
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const next = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = next;
    }
  }
  return row[b.length];
}

export function namesExact(a, b) {
  const left = nameTokens(a);
  const right = nameTokens(b);
  if (!left.length || !right.length) return false;
  if (left.length < 2 || right.length < 2) {
    return left.length === 1 && right.length === 1 && left[0] === right[0];
  }
  const rightSet = new Set(right);
  const overlap = left.filter((token) => rightSet.has(token)).length;
  return overlap >= Math.min(left.length, right.length) && overlap >= 2;
}

export function canonicalEmployeeNumber(value) {
  const compact = trimText(value).replace(/\s+/g, "");
  if (!compact) return "";
  const stripped = compact.replace(/^0+/, "");
  return stripped || "0";
}

function facialNumber(row) {
  return trimText(row?.PersonID ?? row?.personID);
}

function facialName(row) {
  return trimText(row?.PersonName ?? row?.personName);
}

function classifyExactNumber(userName, attendanceName) {
  if (!trimText(userName) || !trimText(attendanceName)) return ISSUE.blankName;
  if (namesExact(userName, attendanceName)) return ISSUE.matched;
  return ISSUE.numberMatchNameDiff;
}

function makeRow({ user, facial, issue }) {
  const usersEmployeeNumber = trimText(user?.employeeNumber);
  const attendanceEmployeeNumber = facialNumber(facial);
  return {
    id: `${issue}|${usersEmployeeNumber}|${attendanceEmployeeNumber}|${usersListName(user)}|${facialName(facial)}`,
    usersEmployeeNumber,
    usersName: user ? usersListName(user) : "",
    attendanceEmployeeNumber,
    attendanceName: facial ? facialName(facial) : "",
    lastSeen: facial?.lastSeen ?? facial?.LastSeen ?? null,
    issue,
    numbersExact:
      Boolean(usersEmployeeNumber) &&
      usersEmployeeNumber === attendanceEmployeeNumber,
  };
}

function tokensExact(left, right) {
  if (!left.length || !right.length) return false;
  if (left.length < 2 || right.length < 2) {
    return left.length === 1 && right.length === 1 && left[0] === right[0];
  }
  const rightSet = new Set(right);
  const overlap = left.filter((token) => rightSet.has(token)).length;
  return overlap >= Math.min(left.length, right.length) && overlap >= 2;
}

function possibleTokenScore(left, right) {
  if (tokensExact(left, right)) return 0;
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right);
  const shared = left.filter((token) => token.length >= 4 && rightSet.has(token));
  if (!shared.length) return 0;
  const sharedSet = new Set(shared);
  const restLeft = left.filter((token) => !sharedSet.has(token)).slice(0, 4);
  const restRight = right.filter((token) => !sharedSet.has(token)).slice(0, 4);
  let close = false;
  for (const x of restLeft) {
    for (const y of restRight) {
      if (
        x.length >= 3 &&
        y.length >= 3 &&
        (x.slice(0, 3) === y.slice(0, 3) ||
          (Math.abs(x.length - y.length) <= 1 && levenshtein(x, y) <= 1))
      ) {
        close = true;
        break;
      }
    }
    if (close) break;
  }
  if (!close) return 0;
  return shared.length * 10 + 1;
}

function assignUniquePairs(candidates) {
  candidates.sort((a, b) => b.score - a.score);
  const usedUsers = new Set();
  const usedFacial = new Set();
  const pairs = [];
  candidates.forEach((candidate) => {
    if (usedUsers.has(candidate.userIndex) || usedFacial.has(candidate.facialIndex)) {
      return;
    }
    usedUsers.add(candidate.userIndex);
    usedFacial.add(candidate.facialIndex);
    pairs.push(candidate);
  });
  return { pairs, usedUsers, usedFacial };
}

function pairByIndexedName(users, facialRows, mode) {
  const facialTokens = facialRows.map((row) => nameTokens(facialName(row)));
  const index = new Map();
  facialTokens.forEach((tokens, facialIndex) => {
    new Set(tokens.filter((token) => token.length >= 3)).forEach((token) => {
      const bucket = index.get(token);
      if (bucket) {
        // Cap common-name buckets (e.g. "maria") to keep matching fast.
        if (bucket.length < 48) bucket.push(facialIndex);
      } else index.set(token, [facialIndex]);
    });
  });

  const candidates = [];
  users.forEach((user, userIndex) => {
    const tokens = nameTokens(usersListName(user));
    const keys = [...new Set(tokens.filter((token) => token.length >= 3))];
    if (!keys.length) return;
    const seen = new Set();
    let best = null;
    let second = 0;
    keys.forEach((token) => {
      const hits = index.get(token);
      if (!hits) return;
      for (let i = 0; i < hits.length; i += 1) {
        const facialIndex = hits[i];
        if (seen.has(facialIndex)) continue;
        seen.add(facialIndex);
        if (seen.size > 64) break;
        const score =
          mode === "exact"
            ? tokensExact(tokens, facialTokens[facialIndex])
              ? 100
              : 0
            : possibleTokenScore(tokens, facialTokens[facialIndex]);
        if (score <= 0) continue;
        if (!best || score > best.score) {
          second = best ? best.score : 0;
          best = {
            user,
            facial: facialRows[facialIndex],
            userIndex,
            facialIndex,
            score,
          };
        } else if (score > second) {
          second = score;
        }
      }
    });
    if (best && best.score > second) candidates.push(best);
  });

  return assignUniquePairs(candidates);
}

function dropUsed(list, used) {
  return list.filter((_, index) => !used.has(index));
}

export function compareFacialUsers(usersInput, facialInput) {
  const users = Array.isArray(usersInput) ? usersInput : [];
  const facialRows = [];
  const seenFacial = new Set();
  (Array.isArray(facialInput) ? facialInput : []).forEach((row) => {
    const number = facialNumber(row);
    if (!number || seenFacial.has(number)) return;
    seenFacial.add(number);
    facialRows.push(row);
  });

  const facialByExact = new Map();
  const facialByCanonical = new Map();
  facialRows.forEach((row) => {
    const number = facialNumber(row);
    facialByExact.set(number, row);
    const canonical = canonicalEmployeeNumber(number);
    if (!canonical) return;
    const bucket = facialByCanonical.get(canonical) || [];
    bucket.push(row);
    facialByCanonical.set(canonical, bucket);
  });

  const usedFacial = new Set();
  const pairedUserIndexes = new Set();
  const rows = [];

  users.forEach((user, index) => {
    const number = trimText(user?.employeeNumber);
    const facial = number ? facialByExact.get(number) : null;
    if (!facial || usedFacial.has(facialNumber(facial))) return;
    usedFacial.add(facialNumber(facial));
    pairedUserIndexes.add(index);
    rows.push(
      makeRow({
        user,
        facial,
        issue: classifyExactNumber(usersListName(user), facialName(facial)),
      }),
    );
  });

  const usersAfterExact = users.filter((_, index) => !pairedUserIndexes.has(index));
  const facialAfterExact = facialRows.filter(
    (row) => !usedFacial.has(facialNumber(row)),
  );
  const nearUsedUsers = new Set();
  const nearUsedFacial = new Set();

  usersAfterExact.forEach((user, userIndex) => {
    const canonical = canonicalEmployeeNumber(user?.employeeNumber);
    if (!canonical) return;
    const bucket = (facialByCanonical.get(canonical) || []).filter(
      (row) => !usedFacial.has(facialNumber(row)) && !nearUsedFacial.has(facialNumber(row)),
    );
    if (bucket.length !== 1) return;
    const facial = bucket[0];
    nearUsedUsers.add(userIndex);
    nearUsedFacial.add(facialNumber(facial));
    usedFacial.add(facialNumber(facial));
    rows.push(
      makeRow({
        user,
        facial,
        issue: ISSUE.nearNumber,
      }),
    );
  });

  let remainingUsers = usersAfterExact.filter((_, index) => !nearUsedUsers.has(index));
  let remainingFacial = facialAfterExact.filter(
    (row) => !nearUsedFacial.has(facialNumber(row)),
  );

  const exactName = pairByIndexedName(remainingUsers, remainingFacial, "exact");
  exactName.pairs.forEach((pair) => {
    rows.push(
      makeRow({
        user: pair.user,
        facial: pair.facial,
        issue: ISSUE.nameMatchNumberDiff,
      }),
    );
  });
  remainingUsers = dropUsed(remainingUsers, exactName.usedUsers);
  remainingFacial = dropUsed(remainingFacial, exactName.usedFacial);

  const possible = pairByIndexedName(remainingUsers, remainingFacial, "possible");
  possible.pairs.forEach((pair) => {
    rows.push(
      makeRow({
        user: pair.user,
        facial: pair.facial,
        issue: ISSUE.possibleIdMismatch,
      }),
    );
  });
  remainingUsers = dropUsed(remainingUsers, possible.usedUsers);
  remainingFacial = dropUsed(remainingFacial, possible.usedFacial);

  remainingUsers.forEach((user) => {
    rows.push(makeRow({ user, facial: null, issue: ISSUE.usersOnly }));
  });
  remainingFacial.forEach((facial) => {
    rows.push(makeRow({ user: null, facial, issue: ISSUE.facialOnly }));
  });

  rows.forEach((row, index) => {
    row.id = `${index}|${row.id}`;
  });

  rows.sort((a, b) => {
    const issueDelta = (ISSUE_SORT[a.issue] ?? 9) - (ISSUE_SORT[b.issue] ?? 9);
    if (issueDelta) return issueDelta;
    const nameA = a.usersName || a.attendanceName;
    const nameB = b.usersName || b.attendanceName;
    return nameA.localeCompare(nameB);
  });

  const bothNumbersMatch = rows.filter((row) => row.numbersExact).length;
  const stats = {
    usersCount: users.length,
    facialCount: facialRows.length,
    bothNumbersMatch,
    bothNumbersMatchNamesDiffer: rows.filter(
      (row) => row.issue === ISSUE.numberMatchNameDiff,
    ).length,
    namesMatchNumbersDiffer: rows.filter(
      (row) => row.issue === ISSUE.nameMatchNumberDiff,
    ).length,
    nearNumber: rows.filter((row) => row.issue === ISSUE.nearNumber).length,
    possibleIdMismatch: rows.filter((row) => row.issue === ISSUE.possibleIdMismatch)
      .length,
    blankName: rows.filter((row) => row.issue === ISSUE.blankName).length,
    usersOnly: rows.filter((row) => row.issue === ISSUE.usersOnly).length,
    facialOnly: rows.filter((row) => row.issue === ISSUE.facialOnly).length,
    noRecordsCount: users.length - bothNumbersMatch,
    matchRate: users.length
      ? Math.round((bothNumbersMatch / users.length) * 100)
      : 0,
  };

  return { rows, stats };
}

export function rowMatchesFilter(row, filter) {
  if (!filter || filter === "all") return true;
  if (filter === "users") return Boolean(row.usersEmployeeNumber || row.usersName);
  if (filter === "facial") {
    return Boolean(row.attendanceEmployeeNumber || row.attendanceName);
  }
  if (filter === "number_match") return row.numbersExact;
  if (filter === "name_diff") return row.issue === ISSUE.numberMatchNameDiff;
  if (filter === "name_number_diff") return row.issue === ISSUE.nameMatchNumberDiff;
  if (filter === "near_number") return row.issue === ISSUE.nearNumber;
  if (filter === "possible") return row.issue === ISSUE.possibleIdMismatch;
  if (filter === "blank_name") return row.issue === ISSUE.blankName;
  if (filter === "users_only") return row.issue === ISSUE.usersOnly;
  if (filter === "facial_only") return row.issue === ISSUE.facialOnly;
  return true;
}
