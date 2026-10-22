from datetime import date, datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator

Group = Literal['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
Component = Literal['red_cells', 'whole_blood', 'platelets', 'plasma']

class Login(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=1, max_length=72)

class Register(Login):
    name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=3, max_length=30)
    role: Literal['donor', 'requester'] = 'requester'
    consent: bool
    blood_group: Group = 'O+'
    city: str = Field(default='Mumbai', min_length=2, max_length=80)
    locality: str = Field(default='', max_length=100)
    dob: date = date(2000, 1, 1)
    lat: float = Field(default=19.08, ge=-90, le=90)
    lng: float = Field(default=72.88, ge=-180, le=180)

    @model_validator(mode='after')
    def validate_registration(self):
        if not self.consent:
            raise ValueError('Privacy consent is required')
        if len(self.password) < 10 or len(self.password.encode()) > 72:
            raise ValueError('Password must be at least 10 characters and at most 72 bytes')
        if '@' not in self.email or '.' not in self.email.split('@')[-1]:
            raise ValueError('Enter a valid email')
        if self.role == 'donor' and (date.today() - self.dob).days < 18 * 365.25:
            raise ValueError('Donor registration is restricted to adults; eligibility still requires clinical review')
        return self

class Profile(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=3, max_length=30)
    city: str = Field(default='Mumbai', min_length=2, max_length=80)
    locality: str = Field(default='', max_length=100)
    lat: float = Field(default=19.08, ge=-90, le=90)
    lng: float = Field(default=72.88, ge=-180, le=180)
    available: bool = True
    last_donation: date | None = None
    unavailable_until: date | None = None
    share_history: bool = False
    preferred_contact: Literal['email', 'phone'] = 'email'

    @field_validator('last_donation')
    @classmethod
    def past_date(cls, v):
        if v and v > date.today():
            raise ValueError('Last donation cannot be in the future')
        return v

class RequestInput(BaseModel):
    patient: str = Field(min_length=1, max_length=80)
    blood_group: Group
    component: Component = 'red_cells'
    units: int = Field(ge=1, le=20)
    hospital: str = Field(min_length=3, max_length=120)
    city: str = Field(min_length=2, max_length=80)
    locality: str = Field(default='', max_length=100)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    needed_at: datetime
    urgency: Literal['urgent', 'scheduled'] = 'urgent'
    doctor_reference: str = Field(default='', max_length=120)
    notes: str = Field(default='', max_length=1500)
    radius: int = Field(default=50, ge=1, le=500)

    @field_validator('needed_at')
    @classmethod
    def future_date(cls, v):
        if v.tzinfo:
            v = v.astimezone(timezone.utc).replace(tzinfo=None)
        if v <= datetime.utcnow():
            raise ValueError('Needed date must be in the future')
        return v

class BankInput(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    city: str = Field(min_length=2, max_length=80)
    address: str = Field(min_length=3, max_length=200)
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    phone: str = Field(default='', max_length=30)
    hours: str = Field(default='Confirm with facility', max_length=100)
    components: str = Field(default='Confirm with facility', max_length=200)
    source: str = Field(min_length=3, max_length=200)
    demo: bool = False

class Respond(BaseModel):
    action: Literal['accepted', 'rejected']

class StatusInput(BaseModel):
    status: Literal['fulfilled', 'cancelled']

class ReportInput(BaseModel):
    target_id: int
    reason: str = Field(min_length=5, max_length=500)
    block: bool = False

class PasswordInput(BaseModel):
    current: str
    new: str = Field(min_length=10, max_length=72)

class Moderate(BaseModel):
    active: bool | None = None
    verified: bool | None = None

class Scenario(BaseModel):
    scenario: Literal['success', 'no_nearby', 'multiple']
