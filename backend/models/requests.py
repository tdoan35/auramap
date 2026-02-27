from pydantic import BaseModel
from .tour import Location, POI, RouteLeg


class RouteData(BaseModel):
    start: Location
    end: Location
    polyline: str
    total_distance_m: int
    total_duration_s: int


class TourGenerateRequest(BaseModel):
    route: RouteData
    selected_pois: list[POI] = []
    legs: list[RouteLeg] = []
    voice_id: str = "English_CalmWoman"


class TourAskContext(BaseModel):
    current_segment_id: int
    current_segment_type: str
    current_transcript: str
    previous_transcripts: list[str] = []
    current_location: dict = {}
    nearby_pois: list[str] = []


class TourAskRequest(BaseModel):
    question: str
    context: TourAskContext
