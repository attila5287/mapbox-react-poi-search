import { useState, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { SearchBoxCore, SessionToken } from "@mapbox/search-js-core";
import "mapbox-gl/dist/mapbox-gl.css";
import "./App.css";
import POIMarker from "./components/POImarker.tsx";

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const DEFAULT_MAP_BOUNDS: [mapboxgl.LngLatLike, mapboxgl.LngLatLike] = [
  [-74.03189, 40.69684],
  [-73.98121, 40.72286],
];

// Type for search results
interface SearchFeature {
  properties: {
    mapbox_id: string;
    [key: string]: any;
  };
  [key: string]: any;
}

function App() {
  const mapRef = useRef<mapboxgl.Map | null>(null); // ref for the Map() instance
  const mapContainerRef = useRef<HTMLDivElement>(null); // ref for the map container DOM element
  const searchRef = useRef<SearchBoxCore | null>(null); // ref for the SearchBoxCore() instance
  
  const [showSearchAreaButton, setShowSearchAreaButton] = useState(false); // show the "search this area" button
  const [searchCategory, setSearchCategory] = useState<string | undefined>(); // the selected category
  const [searchResults, setSearchResults] = useState<SearchFeature[]>([]); // an array of search results
  const [mapBounds, setMapBounds] = useState<number[][] | undefined>();     // the current map bounds
  const [searchBounds, setSearchBounds] = useState<number[][] | undefined>(); // the bounds of the search results

  // function to perform a category search using the SearchBoxCore() instance
  // uses the current map bounds and the selected category to search for points of interest
  const performCategorySearch = async () => {
    if (!searchCategory || !mapBounds || !searchRef.current) return;
    const { features } = await searchRef.current.category(searchCategory, {
      bbox: mapBounds,
      limit: 25,
    });
    setSearchResults(features);
    setSearchBounds(mapBounds);
    console.log("Search results:", features);
  };

  useEffect(() => {
    function boundsChanged(boundsA: number[][] | undefined, boundsB: number[][] | undefined) {
      if (!boundsA || !boundsB) return false;
      return JSON.stringify(boundsA) !== JSON.stringify(boundsB);
    }

    if (searchCategory && boundsChanged(mapBounds, searchBounds)) {
      setShowSearchAreaButton(true);
    } else {
      setShowSearchAreaButton(false);
    }
  }, [mapBounds, searchCategory, searchBounds]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapRef.current = new mapboxgl.Map({
      accessToken: MAPBOX_ACCESS_TOKEN, // set the Mapbox access token
      container: mapContainerRef.current, // display the map in this DOM element
      bounds: DEFAULT_MAP_BOUNDS, // set the initial map bounds
      minZoom: 13, // set the minimum zoom level to avoid zooming out too far
      config: {
        basemap: {
          showPointOfInterestLabels: false, // disable POI labels
        },
      },
    });

    // when the map is loaded, set mapBounds to the current map bounds
    mapRef.current.on("load", () => {
      if (mapRef.current) {
        setMapBounds(mapRef.current.getBounds().toArray());
      }
    });

    // when the map moves, set mapBounds to the current map bounds
    mapRef.current.on("moveend", () => {
      if (mapRef.current) {
        setMapBounds(mapRef.current.getBounds().toArray());
      }
    });

    // instantiate the search box
    searchRef.current = new SearchBoxCore({ accessToken: MAPBOX_ACCESS_TOKEN });
    new SessionToken();

    // cleanup function: remove the map when the component unmounts
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  // when the searchCategory changes, perform a category search
  useEffect(() => {
    performCategorySearch();
  }, [searchCategory]);

  // configuration array for category search buttons
  const categoryButtons = [
    { label: "☕ Coffee", value: "coffee" },
    { label: "🍽️ Restaurants", value: "restaurant" },
    { label: "🍸 Bars", value: "bar" },
    { label: "🏨 Hotels", value: "hotel" },
    { label: "🏛️ Museums", value: "museum" },
  ];

  return (
    <>
      {/* Show category search buttons */}
      <div className="button-container">
        {categoryButtons.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setSearchCategory(value)}
            className={`category-button ${
              searchCategory === value && "active"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Show "search this area" button */}
      {showSearchAreaButton && (
        <div>
          <button
            onClick={performCategorySearch}
            className="search-area-button"
          >
            Search this area
          </button>
          <p className="search-area-button-text">(away from last search)</p>
        </div>
      )}

      {/* Map container */}
      <div id="map-container" ref={mapContainerRef} />

      {/* render a POIMarker for each feature in searchResults */}
      {searchResults.length > 0 &&
        searchResults.map((feature) => (
          <POIMarker
            key={feature.properties.mapbox_id}
            map={mapRef.current}
            feature={feature}
            category={searchCategory}
          />
        ))}
    </>
  );
}

export default App;