// Single source of truth for profile labels & options. The components used
// to repeat this map four times — now they all read it from the shared
// `cheatingDaddy.profiles` API exposed by `renderer.js`.

const PROFILES = [
    { value: 'interview', label: 'Job Interview', shortLabel: 'Interview' },
    { value: 'sales', label: 'Sales Call', shortLabel: 'Sales Call' },
    { value: 'meeting', label: 'Business Meeting', shortLabel: 'Meeting' },
    { value: 'presentation', label: 'Presentation', shortLabel: 'Presentation' },
    { value: 'negotiation', label: 'Negotiation', shortLabel: 'Negotiation' },
    { value: 'exam', label: 'Exam Assistant', shortLabel: 'Exam' },
];

const PROFILE_LABELS = PROFILES.reduce((acc, p) => {
    acc[p.value] = p.label;
    return acc;
}, {});

const PROFILE_SHORT_LABELS = PROFILES.reduce((acc, p) => {
    acc[p.value] = p.shortLabel;
    return acc;
}, {});

module.exports = {
    PROFILES,
    PROFILE_LABELS,
    PROFILE_SHORT_LABELS,
};
