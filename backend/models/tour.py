from pydantic import BaseModel


class Location(BaseModel):
    lat: float
    lng: float
    name: str


class POI(BaseModel):
    place_id: str
    name: str
    lat: float
    lng: float
    types: list[str] = []
    rating: float | None = None


class EnrichedPOI(POI):
    description: str = ""
    history: str = ""
    stories: list[str] = []
    reviews_summary: str = ""


class RouteLeg(BaseModel):
    start_name: str
    end_name: str
    distance_m: int
    duration_s: int


class TourSegment(BaseModel):
    segment_id: int
    type: str  # "opening", "transit", "poi_arrival", "outro"
    label: str
    target_duration_s: int
    target_word_count: int
    key_themes: list[str] = []
    transition_hook: str | None = None
    story_angle: str | None = None
    poi_name: str | None = None


class TourOutline(BaseModel):
    tour_id: str
    theme: str
    tone: str
    arc: str
    segments: list[TourSegment]


class GeneratedSegment(BaseModel):
    segment_id: int
    type: str
    label: str
    transcript: str
    audio_url: str
    duration_s: float
