export const isUrgent = (task, today, urgentHorizonDays = 2) => {
    if (!task.dueDay)
        return false;
    if (task.dueDay < today)
        return true;
    const urgent = new Date(`${task.dueDay}T00:00:00Z`).getTime() -
        new Date(`${today}T00:00:00Z`).getTime();
    return urgent <= urgentHorizonDays * 86_400_000;
};
export const isImportant = (task) => task.priority >= 2;
export const eisenhowerBuckets = (state, today, urgentHorizonDays = 2) => {
    const buckets = {
        importantUrgent: [],
        importantNotUrgent: [],
        notImportantUrgent: [],
        notImportantNotUrgent: [],
    };
    for (const task of Object.values(state.tasks)) {
        if (task.status !== 'open')
            continue;
        const urgent = isUrgent(task, today, urgentHorizonDays);
        const important = isImportant(task);
        if (important && urgent)
            buckets.importantUrgent.push(task);
        else if (important && !urgent)
            buckets.importantNotUrgent.push(task);
        else if (!important && urgent)
            buckets.notImportantUrgent.push(task);
        else
            buckets.notImportantNotUrgent.push(task);
    }
    for (const key of Object.keys(buckets)) {
        buckets[key].sort((a, b) => b.priority - a.priority || (a.dueDay ?? '9999').localeCompare(b.dueDay ?? '9999'));
    }
    return buckets;
};
export const eisenhowerQuadrant = (task, today) => {
    const urgent = isUrgent(task, today);
    const important = isImportant(task);
    if (important && urgent)
        return 'importantUrgent';
    if (important)
        return 'importantNotUrgent';
    if (urgent)
        return 'notImportantUrgent';
    return 'notImportantNotUrgent';
};
