import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const weatherIcons = {
  Clear: "☀️", Clouds: "🌥️", Rain: "🌧️", Snow: "❄️", Thunderstorm: "⛈️", Drizzle: "🌦️",
  Mist: "🌫️", Smoke: "🌫️", Haze: "🌫️", Dust: "🌫️", Fog: "🌫️", Sand: "🌫️", Ash: "🌫️",
  Squall: "🌫️", Tornado: "🌪️",
};

const getSeason = (month) => {
  if ([11, 0, 1].includes(month)) return "Winter";
  if ([2, 3, 4].includes(month)) return "Spring";
  if ([5, 6, 7].includes(month)) return "Summer";
  if ([8, 9, 10].includes(month)) return "Autumn";
};

const getBgImage = (weather, temp) => {
  if (weather === "Rain") return "bg-rainy";
  if (weather === "Snow") return "bg-snowy";
  if (weather === "Clear" && temp > 25) return "bg-sunny";
  if (weather === "Clear") return "bg-clear";
  if (weather === "Clouds") return "bg-cloudy";
  return "bg-default";
};

export default function WeatherApp() {
  const [weather, setWeather] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("Gorakhpur");
  const [query, setQuery] = useState("Gorakhpur");
  const [isAuth, setIsAuth] = useState(null); // null = checking, true/false after check

  // Check auth once (no redirect); used to decide icon destination
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/me`, { withCredentials: true });
        if (!cancelled) setIsAuth(!!res.data?.success);
      } catch {
        if (!cancelled) setIsAuth(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    async function fetchWeather() {
      try {
        setLoading(true);
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${import.meta.env.VITE_API_KEY}&units=metric`);
        const data = await res.json();
        if (data.cod !== 200) throw new Error(data.message);
        setWeather(data);
        const res2 = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${query}&appid=${import.meta.env.VITE_API_KEY}&units=metric`);
        const data2 = await res2.json();
        setHourly(data2.list.slice(0, 6));
      } catch {
        alert("City not found. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchWeather();
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (city.trim()) setQuery(city.trim());
  };

  const glassBg = "backdrop-blur-lg bg-white/10 border border-white/20 shadow-xl rounded-3xl";
  const bgClass = weather ? getBgImage(weather.weather[0].main, weather.main.temp) : "bg-default";

  return (
    <div className={`relative min-h-screen flex items-center justify-center overflow-hidden transition-all duration-500 ${bgClass}`} style={{ background: "linear-gradient(135deg, #210148 0%, #1e1b4b 100%)" }}>
      <div className="relative z-10 w-full max-w-2xl px-4 sm:px-6 py-6 mt-5">
        <form onSubmit={handleSearch} className="mb-6 flex flex-col sm:flex-row justify-center gap-3 items-center">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city name"
            className="px-4 py-2 w-full sm:w-auto rounded-full text-sm bg-white/80 focus:outline-none"
          />
          <button type="submit" className="px-4 py-2 w-full sm:w-auto rounded-full bg-white text-sm font-medium hover:bg-white/90">
            Search
          </button>
        </form>

        <div className={`${glassBg} p-6 sm:p-8`}>
          {loading || !weather ? (
            <div className="text-center text-white text-xl">Loading...</div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="text-xl sm:text-2xl font-semibold text-white drop-shadow">{weather.name}</div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-5xl sm:text-7xl font-bold text-white drop-shadow">
                    {Math.round(weather.main.temp)}°
                  </span>
                  <span className="text-4xl sm:text-5xl">
                    {isAuth === null ? (
                      <span className="opacity-60">
                        {weatherIcons[weather.weather[0].main] || "🌡️"}
                      </span>
                    ) : (
                      <Link to={isAuth ? "/card" : "/login"} title={isAuth ? "Go to chats" : "Login"}>
                        {weatherIcons[weather.weather[0].main] || "🌡️"}
                      </Link>
                    )}
                  </span>
                </div>
                <div className="text-base sm:text-lg text-white/80 mt-2">
                  {weather.weather[0].main} | {weather.weather[0].description}
                </div>
                <div className="text-sm text-white/60 mt-1">
                  H:{Math.round(weather.main.temp_max)}° L:{Math.round(weather.main.temp_min)}°
                </div>
                <div className="text-xs text-white/40 mt-1">
                  Season: {getSeason(new Date().getMonth())}
                </div>
              </div>

              <div className="mb-6 overflow-x-auto">
                <div className="flex gap-3 justify-start sm:justify-center min-w-[360px] snap-x snap-mandatory">
                  {hourly.map((h, i) => (
                    <div key={i} className={`flex flex-col items-center px-3 py-2 rounded-xl snap-start ${i === 1 ? "bg-white/20 border border-white/30" : ""}`}>
                      <span className="text-xs text-white/80">
                        {i === 0 ? `${new Date(h.dt * 1000).getHours()}:00` : i === 1 ? "Now" : `${new Date(h.dt * 1000).getHours()}:00`}
                      </span>
                      <span className="text-xl sm:text-2xl">{weatherIcons[h.weather[0].main] || "🌡️"}</span>
                      <span className="text-sm text-white/90">{Math.round(h.main.temp)}°</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 text-white/90">
                {[
                  { label: "Humidity", value: `${weather.main.humidity}%` },
                  { label: "Wind", value: `${weather.wind.speed} m/s` },
                  { label: "Pressure", value: `${weather.main.pressure} hPa` },
                  { label: "Visibility", value: `${weather.visibility / 1000} km` },
                ].map((item, index) => (
                  <div key={index} className={`${glassBg} p-4`}>
                    <div className="text-xs mb-1">{item.label}</div>
                    <div className="font-bold text-lg">{item.value}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
