"""
Seed data: 10 iconic San Francisco POIs with pre-written descriptions.
Used to bootstrap the Neo4j knowledge graph on first startup.
"""

from backend.services.neo4j_client import store_poi_knowledge
from backend.agent.event_bus import EventBus

SF_POIS = [
    {
        "name": "Ferry Building",
        "description": "The Ferry Building is a terminal for ferries on the San Francisco Bay and a renowned marketplace featuring artisan food vendors, farmers markets, and waterfront dining.",
        "history": "Built in 1898, the Ferry Building survived the 1906 earthquake and served as the main point of entry for commuters before the Bay Bridge opened in 1936. After decades of decline, it was restored in 2003 as a world-class food hall.",
        "stories": [
            "Before the bridges, 50,000 commuters passed through the Ferry Building daily, making it the second-busiest transit terminal in the world after Charing Cross in London.",
            "The clock tower was modeled after the Giralda bell tower in Seville, Spain."
        ],
        "rating": 4.6,
        "types": ["landmark", "marketplace", "transit"],
    },
    {
        "name": "Coit Tower",
        "description": "Coit Tower is an Art Deco tower on Telegraph Hill offering panoramic views of San Francisco and the bay. Its interior features Depression-era murals.",
        "history": "Completed in 1933, the tower was funded by Lillie Hitchcock Coit's bequest to beautify the city. The 27 murals inside were painted by 25 artists as part of a Public Works of Art Project.",
        "stories": [
            "Lillie Hitchcock Coit was an eccentric socialite who chased fire engines and was made an honorary member of Knickerbocker Engine Co. No. 5.",
            "The murals caused controversy for their socialist themes, including a worker reading a newspaper with the headline 'Worker Unite.'"
        ],
        "rating": 4.5,
        "types": ["landmark", "observation", "art"],
    },
    {
        "name": "Golden Gate Bridge",
        "description": "The Golden Gate Bridge is a 1.7-mile suspension bridge spanning the Golden Gate strait, connecting San Francisco to Marin County. It is one of the most photographed structures in the world.",
        "history": "Opened in 1937, the bridge was designed by Joseph Strauss and Irving Morrow. At the time of completion, it was the longest and tallest suspension bridge in the world with its 4,200-foot main span.",
        "stories": [
            "The bridge's signature 'International Orange' color was originally intended as a temporary primer. The consulting architect loved it so much it became permanent.",
            "During construction, a safety net saved 19 men who fell — they became known as the 'Halfway to Hell Club.'"
        ],
        "rating": 4.8,
        "types": ["landmark", "bridge", "engineering"],
    },
    {
        "name": "Chinatown Gate",
        "description": "The Chinatown Gate marks the entrance to the oldest Chinatown in North America and the largest Chinese community outside Asia, centered on Grant Avenue and Stockton Street.",
        "history": "San Francisco's Chinatown was established in 1848, and the ornamental gate at Grant Avenue and Bush Street was erected in 1970. The neighborhood was rebuilt after complete destruction in the 1906 earthquake.",
        "stories": [
            "Fortune cookies were popularized in San Francisco's Chinatown, not China. They were likely inspired by Japanese senbei crackers.",
            "The neighborhood's 24 blocks are home to the oldest Chinese temple in North America, Tin How Temple, built in 1852."
        ],
        "rating": 4.4,
        "types": ["landmark", "cultural", "neighborhood"],
    },
    {
        "name": "Fisherman's Wharf",
        "description": "Fisherman's Wharf is a bustling waterfront district known for its seafood restaurants, souvenir shops, sea lions at Pier 39, and views of Alcatraz Island.",
        "history": "The wharf has been the heart of San Francisco's fishing industry since the Gold Rush era of the 1850s, when Italian immigrant fishermen settled the area. Today it attracts 12 million visitors annually.",
        "stories": [
            "The famous sea lions arrived at Pier 39 shortly after the 1989 earthquake. Marine biologists believe they were attracted by the herring in the bay.",
            "Dungeness crab season, celebrated here every November, dates back to the earliest Italian fishing families."
        ],
        "rating": 4.3,
        "types": ["landmark", "waterfront", "dining"],
    },
    {
        "name": "Palace of Fine Arts",
        "description": "The Palace of Fine Arts is a monumental Greco-Roman structure originally built for the 1915 Panama-Pacific Exposition, set around a tranquil lagoon in the Marina District.",
        "history": "Designed by Bernard Maybeck, it was the only structure from the exposition not demolished afterward due to public outcry. The current structure is a 1965 concrete reconstruction of the original plaster one.",
        "stories": [
            "Maybeck designed it to evoke 'the grandeur of Roman ruins' and the melancholy of lost civilizations.",
            "George Lucas filmed scenes for Indiana Jones and the Last Crusade near the Palace."
        ],
        "rating": 4.7,
        "types": ["landmark", "architecture", "park"],
    },
    {
        "name": "Lombard Street",
        "description": "Lombard Street's one-block section between Hyde and Leavenworth streets features eight sharp switchback turns, earning it the title of 'crookedest street in the world.'",
        "history": "The curves were added in 1922 to reduce the hill's natural 27% grade to 16%. Property owner Carl Henry suggested the switchbacks to make the steep hill navigable by automobile.",
        "stories": [
            "Vermont Street in the Potrero Hill neighborhood actually has more curves, but Lombard gets all the fame.",
            "About 2 million visitors drive or walk down Lombard Street each year, causing ongoing debates about vehicle fees."
        ],
        "rating": 4.4,
        "types": ["landmark", "street", "scenic"],
    },
    {
        "name": "Alcatraz Island",
        "description": "Alcatraz Island is a former federal penitentiary in San Francisco Bay, now a national historic landmark and popular tourist destination accessible by ferry.",
        "history": "The island served as a military fort from the 1850s, a military prison from 1907, and a federal penitentiary from 1934 to 1963. Famous inmates included Al Capone, 'Machine Gun' Kelly, and Robert Stroud.",
        "stories": [
            "In June 1962, Frank Morris and the Anglin brothers escaped using dummy heads made of papier-mâché and real hair. They were never found.",
            "In 1969, Native American activists occupied the island for 19 months, bringing national attention to indigenous rights."
        ],
        "rating": 4.7,
        "types": ["landmark", "historic", "museum"],
    },
    {
        "name": "Painted Ladies",
        "description": "The Painted Ladies are a row of colorful Victorian houses along Steiner Street facing Alamo Square park, forming one of San Francisco's most iconic postcard views.",
        "history": "Built between 1892 and 1896 by developer Matthew Kavanaugh, these Queen Anne-style homes survived the 1906 earthquake. The term 'Painted Ladies' was coined in 1978 by authors Elizabeth Pomada and Michael Larsen.",
        "stories": [
            "The houses were featured in the opening credits of the TV show 'Full House' and its revival 'Fuller House.'",
            "San Francisco has approximately 48,000 Victorian and Edwardian houses — the largest collection in the world."
        ],
        "rating": 4.5,
        "types": ["landmark", "architecture", "residential"],
    },
    {
        "name": "Twin Peaks",
        "description": "Twin Peaks are two prominent hills near the geographic center of San Francisco, offering 360-degree panoramic views of the city, bay, and Pacific Ocean.",
        "history": "The Spanish called them 'Los Pechos de la Chola' (Breasts of the Indian Maiden). At 922 feet, they are the second-highest natural point in San Francisco. The surrounding area was one of the last to be developed due to the steep terrain.",
        "stories": [
            "On clear days, you can see the Farallon Islands 30 miles offshore from the summit.",
            "The Christmas Tree Point parking area at the top is a beloved sunset-watching spot for locals."
        ],
        "rating": 4.6,
        "types": ["landmark", "nature", "viewpoint"],
    },
]


def seed_pois():
    """Seed Neo4j with SF POIs. MERGE makes this idempotent."""
    bus = EventBus.get()
    bus.emit("system", "seed_start", details={"poi_count": len(SF_POIS)})

    seeded = 0
    for poi in SF_POIS:
        success = store_poi_knowledge(poi["name"], poi)
        if success:
            seeded += 1
            bus.emit(
                "system",
                "poi_seeded",
                poi_name=poi["name"],
                details={"rating": poi.get("rating")},
            )

    bus.emit(
        "system",
        "seed_complete",
        details={"seeded": seeded, "total": len(SF_POIS)},
    )
    return seeded
