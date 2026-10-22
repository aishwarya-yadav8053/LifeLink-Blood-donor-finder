"""Discovery, not transfusion advice. Red-cell ABO/Rh reference:
https://www.redcrossblood.org/donate-blood/blood-types.html
Whole blood/platelets: conservative exact-group discovery ONLY, not clinical compatibility.
No minimum donation interval is asserted: a conservative prototype hold is not eligibility.
"""
from datetime import date
from math import radians, sin, cos, asin, sqrt

GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
ABO = {'O': {'O', 'A', 'B', 'AB'}, 'A': {'A', 'AB'}, 'B': {'B', 'AB'}, 'AB': {'AB'}}
RECENT_DONATION_HOLD_DAYS = 120

def compatible(donor, recipient, component='red_cells'):
    if donor not in GROUPS or recipient not in GROUPS:
        return False
    if component == 'plasma':
        return donor[:-1] in ABO[recipient[:-1]]
    if component in ('whole_blood', 'platelets'):
        return donor == recipient
    return recipient[:-1] in ABO[donor[:-1]] and (donor[-1] == '-' or recipient[-1] == '+')

def distance(a, b, c, d):
    a, b, c, d = map(radians, (a, b, c, d))
    h = sin((c-a)/2)**2 + cos(a)*cos(c)*sin((d-b)/2)**2
    return round(6371 * 2 * asin(sqrt(min(1, h))), 1)

def available(d):
    return d.available and not (d.unavailable_until and d.unavailable_until >= date.today()) and not (
        d.last_donation and (date.today() - d.last_donation).days < RECENT_DONATION_HOLD_DAYS)
