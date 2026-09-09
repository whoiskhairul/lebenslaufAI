"""Read-only scan: find CP1252 mojibake inside user content stored in the DB."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from resume.models import ResumeVersion, CoverLetterVersion
from master_profile.models import PersonalInfo, WorkExperience, Project
from applications.models import Application

MOJI = ['â€¢', 'â€“', 'â€”', 'â„¢', 'â€œ', 'â€', 'Ã©', 'Ã¼', 'Ã¶', 'ÃŸ', 'Ã¤', 'Ã', 'Â·', 'â†³', 'â–²']


def walk(obj, path=''):
    """Yield (path, value) for every string in dicts/lists."""
    if isinstance(obj, str):
        yield path, obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from walk(v, f'{path}.{k}')
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk(v, f'{path}[{i}]')


def find_moji(s):
    return [m for m in MOJI if m in s]


print('=== ResumeVersion.tailored_details / summary ===')
for rv in ResumeVersion.objects.all().select_related('user'):
    hits = []
    for p, s in walk(rv.tailored_details or {}, 'tailored'):
        bad = find_moji(s)
        if bad:
            hits.append((p, bad[0], s[:60]))
    if rv.tailored_summary:
        bad = find_moji(rv.tailored_summary)
        if bad:
            hits.append(('summary', bad[0], rv.tailored_summary[:60]))
    for p, bad, sample in hits[:3]:
        print(f'  v{str(rv.id)[:8]} user={rv.user.email} {p} {bad} | {sample!r}')
    if len(hits) > 3:
        print(f'  … and {len(hits)-3} more in this version')

print('=== CoverLetterVersion.content ===')
for cl in CoverLetterVersion.objects.all():
    bad = find_moji(cl.content or '')
    if bad:
        print(f'  {str(cl.id)[:8]} user={cl.user.email} {bad[0]} | {cl.content[:60]!r}')

print('=== Master profile ===')
for pi in PersonalInfo.objects.all():
    for field in ('summary', 'full_name', 'title', 'location'):
        v = getattr(pi, field) or ''
        bad = find_moji(v)
        if bad:
            print(f'  PersonalInfo user={pi.user.email} {field} {bad[0]} | {v[:60]!r}')
for we in WorkExperience.objects.all():
    for i, b in enumerate(we.bullets or []):
        bad = find_moji(b)
        if bad:
            print(f'  WorkExperience user={we.user.email} bullet[{i}] {bad[0]} | {b[:60]!r}')
for pr in Project.objects.all():
    for i, b in enumerate(pr.bullets or []):
        bad = find_moji(b)
        if bad:
            print(f'  Project user={pr.user.email} bullet[{i}] {bad[0]} | {b[:60]!r}')

print('=== Applications (notes/jd) ===')
for a in Application.objects.all():
    for field in ('notes', 'job_description'):
        v = getattr(a, field) or ''
        bad = find_moji(v)
        if bad:
            print(f'  App user={a.user.email} {field} {bad[0]} | {v[:60]!r}')

print('scan complete')
