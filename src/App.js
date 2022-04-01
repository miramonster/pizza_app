import React from "react";
import "./index.css";
import "./App.css";
import mapStyles from "./mapStyles";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useLoadScript,
} from "@react-google-maps/api";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxList,
  ComboboxOption,
} from "@reach/combobox";

import "@reach/combobox/styles.css";

const libraries = ["places"];
const mapContainerStyle = { width: "100vw", height: "100vh" };
const center = { lat: 29.760427, lng: -95.369804 };
const options = {
  styles: mapStyles,
  disableDefaultUI: true,
  zoomControl: true,
};

export default function App() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "AIzaSyChx65TaOoV6FVspAn917zZm2siJHJsuEg",
    libraries,
  });

  const mapRef = React.useRef();
  const placesService = React.useRef(null);
  const [userGeo, setUserGeo] = React.useState(null);
  const [markers, setMarkers] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [showCompass, setShowCompass] = React.useState(false);
  const [compassHeading, setCompassHeading] = React.useState(0);

  const onMapLoad = (map) => {
    mapRef.current = map;
    placesService.current = new window.google.maps.places.PlacesService(
      mapRef.current
    );
  };

  const panTo = React.useCallback(({ lat, lng }) => {
    mapRef.current.panTo({ lat, lng });
    mapRef.current.setZoom(12);
  }, []);

  const milesFrom = (userLocation, targetLocation) => {
    const { location } = targetLocation.geometry;
    let dx = userLocation.lat - location.lat(),
      dy = userLocation.lng - location.lng();
    return Math.hypot(dx, dy) * 69.2;
  };

  const radialSearchTrigger = React.useCallback(
    (userPosition, placesService) => {
      placesService.textSearch(
        {
          query: "Pizza",
          location: userPosition,
          radius: 1609.344 * 2,
          type: ["resturaunt", "meal_takeaway"],
        },
        (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            console.log(results);
            setMarkers(
              results
                .map((result) => ({
                  ...result,
                  distanceFromUser: milesFrom(userPosition, result),
                }))
                .sort((a, b) => a.distanceFromUser - b.distanceFromUser)
            );
          }
        }
      );
    }, []
  )

  const markerMaker = (marker) => {
    const { geometry, name, place_id } = marker;
    return (
      <Marker
        key={place_id}
        position={{
          lat: geometry.location.lat(),
          lng: geometry.location.lng(),
        }}
        title={name}
        onClick={() => {
          setSelected({
            lat: geometry.location.lat(),
            lng: geometry.location.lng(),
          });
        }}
        icon={{
          url: "./topPizza.png",
          scaledSize: new window.google.maps.Size(30, 30),
        }}
      />
    );
  };

  React.useEffect(() => {
    setMarkers([]);
    if (userGeo?.lat && userGeo?.lng) {
      radialSearchTrigger(userGeo, placesService.current);
    }
  }, [userGeo?.lat, userGeo?.lng, radialSearchTrigger, userGeo]);

  React.useEffect(() => {
    if (userGeo?.lat && userGeo?.lng && markers?.[0]) {
      let x1 = markers[0].geometry.location.lat();
      let y1 = markers[0].geometry.location.lng();
      let x2 = userGeo.lat;
      let y2 = userGeo.lng;
    
      const getAtan2 = (y, x) => Math.atan2(y, x);
      let compassReading = getAtan2(y1 - y2, x1 - x2) * (180 / Math.PI);
    
      setCompassHeading(compassReading)
    }
  }, [markers, userGeo, setCompassHeading])

  if (loadError) return "Error loading maps";
  if (!isLoaded) return "loading maps";

  return (
    <div>
      <div 
        className="compassContainer"
        style={{
          zIndex: `2`,
          position: "absolute",
          width: '100vw',
          height: '100vh',
          justifyContent: 'center',
          alignItems: 'center',
          display: showCompass ? 'flex' : 'none',
        }}
        >
        <img
        alt=''
          className="comapssSlice"
          src={"./topPizza.png"}
          width="auto"
          height="800"
          style={{
            transition: 'transform 1s ease-in-out',
            transform: `rotate(${compassHeading}deg)`
          }}
        />
        {/* TODO
          Add some container around here...
          use the results of markers[0] to conditionally render this info blob
          markers[0] will also have info for the location that you can use in this info blurb 
          markers[0] && console.log(markers[0]) // use this to see what on that object. 
        */}
      </div>
      <h1>
        Pizza Hunter
        <button
          style={{ background: "transparent", border: "none" }}
          onClick={() => setShowCompass(!showCompass)}
        >
          <img alt='' src={"./topPizza.png"} width="auto" height="80" />
        </button>
      </h1>
      <Locate
        panTo={panTo}
        setUserGeo={setUserGeo}
        radialSearchTrigger={radialSearchTrigger}
        placesService={placesService}
      />
      <Search
        panTo={panTo}
        setUserGeo={setUserGeo}
        placesService={placesService}
        radialSearchTrigger={radialSearchTrigger}
      />
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={8}
        center={center}
        options={options}
        onLoad={onMapLoad}
      >
        {userGeo?.lat && userGeo?.lng && (
          <Marker
            key="userPosition"
            position={userGeo}
            icon={{
              url: "./meeple.png",
              scaledSize: new window.google.maps.Size(60, 60),
            }}
          />
        )}
        {markers.map(markerMaker)}
        {selected ? (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => {
              setSelected(null);
            }}
          >
            <div>
              <h2>
                <span role="img" aria-label="pizza">
                  🍕
                </span>{" "}
                place holder
              </h2>
              <p>address spot</p>
            </div>
          </InfoWindow>
        ) : null}
      </GoogleMap>
    </div>
  );
}

function Locate({ panTo, setUserGeo }) {
  return (
    <button
      className="locate"
      onClick={() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const userPosition = { lat: latitude, lng: longitude };
            panTo(userPosition);
            setUserGeo(userPosition);
          },
          () => {
            throw new Error("geoLocationError");
          }
        );
      }}
    >
      <img src={"./compassRose.png"} alt="compass locate me" />
    </button>
  );
}

function Search({ panTo, setUserGeo }) {
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
  } = usePlacesAutocomplete({
    requestOptions: {},
  });

  return (
    <div className="search">
      <Combobox
        onSelect={async (address) => {
          setValue(address, false);
          try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);
            panTo({ lat, lng });
            setUserGeo({ lat, lng });
          } catch (error) {
            console.log("error");
          }
        }}
      >
        <ComboboxInput
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
          }}
          disabled={!ready}
          placeholder="Enter current address"
        />
        <ComboboxPopover>
          <ComboboxList>
            {status === "OK" &&
              data.map(({ place_id, description }) => (
                <ComboboxOption key={place_id} value={description} />
              ))}
          </ComboboxList>
        </ComboboxPopover>
      </Combobox>
    </div>
  );
}
