document.addEventListener('DOMContentLoaded', () => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const mapContainer = document.getElementById('map');
        const findMeBtn = document.getElementById('findMeBtn');
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        const detailsBtn = document.getElementById('detailsBtn');
        const refreshBtn = document.getElementById('refreshBtn');
        const solutionsBtn = document.getElementById('solutionsBtn');
        const solutionsModal = document.getElementById('solutionsModal');
        const solutionsContent = document.getElementById('solutionsContent');
        const closeModal = document.getElementById('closeModal');
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        const sunIcon = document.getElementById('sunIcon');
        const moonIcon = document.getElementById('moonIcon');
        const locationNameEl = document.getElementById('locationName');
        const weatherDataEl = document.getElementById('weatherData');
        const airQualityResultsContent = document.getElementById('airQualityResultsContent');
        const alertBoxEl = document.getElementById('alertBox');
        const alertMessageEl = document.getElementById('alertMessage');
        const advancedDetailsEl = document.getElementById('advancedDetails');
        const advancedDetailsContentEl = document.getElementById('advancedDetailsContent');

        let map;
        let currentLocationMarker;
        let latestAirSample = null; // { pm2_5, pm10, o3, no2, so2, co }
        let currentLat = null;
        let currentLon = null;
        let aiSuggestionsCache = null;

        // THEME HANDLERS
        function setTheme(mode) {
            const isDark = mode === 'dark';
            document.documentElement.classList.toggle('dark', isDark);
            sunIcon.style.display = isDark ? 'block' : 'none';
            moonIcon.style.display = isDark ? 'none' : 'block';
            localStorage.setItem('theme', mode);
        }
        function toggleTheme() {
            const cur = localStorage.getItem('theme') || 'light';
            setTheme(cur === 'dark' ? 'light' : 'dark');
        }
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) setTheme(savedTheme);
        else setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        themeToggleBtn.addEventListener('click', toggleTheme);

        // MAP
        function initMap(lat, lon) {
            if (map) map.remove();
            map = L.map(mapContainer).setView([lat, lon], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
            currentLocationMarker = L.circleMarker([lat, lon], { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.5, radius: 8 })
                .addTo(map).bindPopup('You are here.').openPopup();
        }

        async function fetchWeatherData(lat, lon) {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;
            try { const res = await fetch(url); if(!res.ok) throw Error(res.statusText); const data = await res.json(); return data.current || null; } 
            catch(e){ console.error(e); return null;}
        }

        async function fetchAirQuality(lat, lon) {
            // Include past hours to avoid future-hour nulls and pick most recent valid sample
            const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide&timezone=auto&past_days=2`;
            try{
                const res = await fetch(url);
                if(!res.ok) throw Error(res.statusText);
                const data = await res.json();
                const h = data.hourly; if(!h || !h.time || h.time.length===0) return null;
                const nowMs = Date.now();
                let bestIdx = -1; let bestTimeMs = -Infinity;
                for(let idx=0; idx<h.time.length; idx++){
                    const tMs = Date.parse(h.time[idx]);
                    if(Number.isFinite(tMs) && tMs <= nowMs){
                        const hasAny = (h.pm2_5?.[idx] ?? null) != null || (h.pm10?.[idx] ?? null) != null || (h.ozone?.[idx] ?? null) != null || (h.nitrogen_dioxide?.[idx] ?? null) != null || (h.sulphur_dioxide?.[idx] ?? null) != null || (h.carbon_monoxide?.[idx] ?? null) != null;
                        if(hasAny && tMs > bestTimeMs){ bestTimeMs = tMs; bestIdx = idx; }
                    }
                }
                const i = bestIdx >= 0 ? bestIdx : (h.time.length - 1);
                return {
                    time: h.time[i],
                    pm2_5: h.pm2_5?.[i] ?? null,
                    pm10: h.pm10?.[i] ?? null,
                    o3: h.ozone?.[i] ?? null,
                    no2: h.nitrogen_dioxide?.[i] ?? null,
                    so2: h.sulphur_dioxide?.[i] ?? null,
                    co: h.carbon_monoxide?.[i] ?? null
                };
            } catch(e){
                console.error('Air quality API failed:', e);
                // Fallback: generate realistic mock data based on location
                return generateMockAirQuality(lat, lon);
            }
        }

        function generateMockAirQuality(lat, lon) {
            // Generate realistic mock data based on location characteristics
            const isUrban = Math.abs(lat) < 60; // Assume urban if not too far north/south
            const isIndustrial = Math.abs(lon) > 100; // Higher pollution in some industrial regions
            const timeOfDay = new Date().getHours();
            const isRushHour = (timeOfDay >= 7 && timeOfDay <= 9) || (timeOfDay >= 17 && timeOfDay <= 19);
            
            let basePM25 = isUrban ? 15 + Math.random() * 20 : 5 + Math.random() * 10;
            let baseNO2 = isUrban ? 20 + Math.random() * 30 : 5 + Math.random() * 15;
            let baseO3 = 30 + Math.random() * 40;
            
            // Adjust for industrial areas and rush hour
            if (isIndustrial) {
                basePM25 *= 1.3;
                baseNO2 *= 1.4;
            }
            if (isRushHour) {
                basePM25 *= 1.2;
                baseNO2 *= 1.5;
            }
            
            return {
                time: new Date().toISOString(),
                pm2_5: Math.max(0, basePM25 + (Math.random() - 0.5) * 10),
                pm10: Math.max(0, basePM25 * 1.5 + (Math.random() - 0.5) * 15),
                o3: Math.max(0, baseO3 + (Math.random() - 0.5) * 20),
                no2: Math.max(0, baseNO2 + (Math.random() - 0.5) * 10),
                so2: Math.max(0, 5 + Math.random() * 10),
                co: Math.max(0, 0.5 + Math.random() * 2),
                mock: true
            };
        }

        async function fetchTEMPOData(lat, lon){ return new Promise(resolve => { setTimeout(()=>{ const no2=(Math.random()*20+5).toFixed(2); const o3=(Math.random()*50+20).toFixed(2); resolve({no2,o3}); },1000); }); }

        async function reverseGeocode(lat, lon){
            try{
                const url=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`;
                const res=await fetch(url,{headers:{'Accept-Language':'en'}});
                const data=await res.json(); const a=data.address||{};
                const placeParts=[(a.house_number&&a.road)?(a.house_number+' '+a.road):a.road,a.footway,a.neighbourhood,a.suburb,a.village,a.town,a.city,a.county].filter(Boolean);
                const region=a.state||a.region||''; const country=a.country||'';
                const primary=placeParts.length?placeParts.join(', '):(data.display_name||''); const parts=[]; if(primary) parts.push(primary); if(region) parts.push(region); if(country) parts.push(country);
                return parts.length?parts.join(', '):`Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`;
            }catch(e){ console.warn(e); return `Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`;}
        }

        async function updateUI(lat, lon){
            loadingOverlay.classList.remove('hidden');
            currentLat = lat;
            currentLon = lon;
            aiSuggestionsCache = null; // Clear cached AI data when location changes
            
            // Close advanced details when changing location
            closeAdvancedDetails();
            
            try{
                const [weather, airQuality, tempo, placeLabel]=await Promise.all([fetchWeatherData(lat,lon), fetchAirQuality(lat,lon), fetchTEMPOData(lat,lon), reverseGeocode(lat,lon)]);
                locationNameEl.textContent = placeLabel;

                if(currentLocationMarker){ currentLocationMarker.setLatLng([lat,lon]); currentLocationMarker.bindPopup(placeLabel).openPopup(); }
                if(map) map.setView([lat,lon], map.getZoom()||13);

                // Weather
                if(weather){ weatherDataEl.innerHTML=`<p>Temp: ${weather.temperature_2m ?? '—'}°C</p><p>Humidity: ${weather.relative_humidity_2m ?? '—'}%</p><p>Wind: ${weather.wind_speed_10m ?? '—'} m/s</p>`; }
                else weatherDataEl.textContent='Weather data unavailable';

                // Air Quality
                if(airQuality){
                    const pm25=airQuality.pm2_5; let aqiStatus='Unknown', aqiColor='text-gray-500';
                    if(pm25==null) aqiStatus='Unknown';
                    else if(pm25<=12) { aqiStatus='Good'; aqiColor='text-green-500'; }
                    else if(pm25<=35.4){ aqiStatus='Moderate'; aqiColor='text-yellow-500'; }
                    else if(pm25<=55.4){ aqiStatus='Unhealthy (Sensitive)'; aqiColor='text-orange-500'; }
                    else if(pm25<=150.4){ aqiStatus='Unhealthy'; aqiColor='text-red-500'; }
                    else { aqiStatus='Very Unhealthy'; aqiColor='text-purple-600'; }

                    const isMockData = airQuality.mock === true; // We set this only for fallback
                    const dataTime = airQuality.time ? new Date(airQuality.time).toLocaleString() : 'Unknown';
                    // Function to get color for pollutant values
                    function getPollutantColor(value, type) {
                        if (value == null) return 'text-gray-500';
                        
                        switch(type) {
                            case 'PM2.5':
                                if (value <= 12) return 'text-green-600';
                                if (value <= 35.4) return 'text-yellow-600';
                                if (value <= 55.4) return 'text-orange-600';
                                if (value <= 150.4) return 'text-red-600';
                                return 'text-purple-600';
                            case 'PM10':
                                if (value <= 20) return 'text-green-600';
                                if (value <= 50) return 'text-yellow-600';
                                if (value <= 100) return 'text-orange-600';
                                if (value <= 200) return 'text-red-600';
                                return 'text-purple-600';
                            case 'O3':
                                if (value <= 60) return 'text-green-600';
                                if (value <= 120) return 'text-yellow-600';
                                if (value <= 180) return 'text-orange-600';
                                if (value <= 240) return 'text-red-600';
                                return 'text-purple-600';
                            case 'NO2':
                                if (value <= 50) return 'text-green-600';
                                if (value <= 100) return 'text-yellow-600';
                                if (value <= 150) return 'text-orange-600';
                                if (value <= 200) return 'text-red-600';
                                return 'text-purple-600';
                            case 'SO2':
                                if (value <= 20) return 'text-green-600';
                                if (value <= 50) return 'text-yellow-600';
                                if (value <= 100) return 'text-orange-600';
                                if (value <= 200) return 'text-red-600';
                                return 'text-purple-600';
                            case 'CO':
                                if (value <= 2) return 'text-green-600';
                                if (value <= 5) return 'text-yellow-600';
                                if (value <= 10) return 'text-orange-600';
                                if (value <= 20) return 'text-red-600';
                                return 'text-purple-600';
                            default:
                                return 'text-gray-600';
                        }
                    }

                    // Get background color for overall AQI status
                    function getAQIBackgroundColor(status) {
                        switch(status) {
                            case 'Good': return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-700';
                            case 'Moderate': return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700';
                            case 'Unhealthy (Sensitive)': return 'bg-orange-100 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700';
                            case 'Unhealthy': return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-700';
                            case 'Very Unhealthy': return 'bg-purple-100 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700';
                            default: return 'bg-gray-100 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700';
                        }
                    }

                    airQualityResultsContent.innerHTML=`
                        <div class="p-3 rounded-lg border-2 ${getAQIBackgroundColor(aqiStatus)} mb-4">
                            <p class="font-bold text-lg text-center">Air Quality: <span class="${aqiColor} text-xl">${aqiStatus}</span></p>
                            ${isMockData ? '<p class="text-sm text-yellow-600 dark:text-yellow-400 text-center mt-1"><em>⚠️ Using estimated data (API unavailable)</em></p>' : ''}
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Data from: ${dataTime}</p>
                        <div class="space-y-2">
                            <p><span class="font-semibold">PM2.5:</span> <span class="${getPollutantColor(pm25, 'PM2.5')} font-bold">${pm25 != null ? pm25.toFixed(1)+' µg/m³':'—'}</span></p>
                            <p><span class="font-semibold">PM10:</span> <span class="${getPollutantColor(airQuality.pm10, 'PM10')} font-bold">${airQuality.pm10 != null?airQuality.pm10.toFixed(1)+' µg/m³':'—'}</span></p>
                            <p><span class="font-semibold">O3:</span> <span class="${getPollutantColor(airQuality.o3, 'O3')} font-bold">${airQuality.o3 != null?airQuality.o3.toFixed(1)+' µg/m³':'—'}</span></p>
                            <p><span class="font-semibold">NO2:</span> <span class="${getPollutantColor(airQuality.no2, 'NO2')} font-bold">${airQuality.no2 != null?airQuality.no2.toFixed(1)+' µg/m³':'—'}</span></p>
                            <p><span class="font-semibold">SO2:</span> <span class="${getPollutantColor(airQuality.so2, 'SO2')} font-bold">${airQuality.so2 != null?airQuality.so2.toFixed(1)+' µg/m³':'—'}</span></p>
                            <p><span class="font-semibold">CO:</span> <span class="${getPollutantColor(airQuality.co, 'CO')} font-bold">${airQuality.co != null?airQuality.co.toFixed(1)+' µg/m³':'—'}</span></p>
                        </div>
                        <div class="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p class="text-sm font-semibold text-blue-800 dark:text-blue-200">TEMPO Data:</p>
                            <p class="text-sm">NO2: <span class="text-blue-600 dark:text-blue-300 font-bold">${tempo.no2} ppb</span>, O3: <span class="text-blue-600 dark:text-blue-300 font-bold">${tempo.o3} ppb</span></p>
                        </div>
                    `;

                    latestAirSample = { pm2_5: airQuality.pm2_5, pm10: airQuality.pm10, o3: airQuality.o3, no2: airQuality.no2, so2: airQuality.so2, co: airQuality.co };

                    // Enhanced alert system with different levels
                    if(pm25!=null && pm25>35.4){
                        let alertLevel = '';
                        let alertMessage = '';
                        let alertColor = '';
                        
                        if(pm25 <= 55.4) {
                            alertLevel = 'Moderate Alert';
                            alertMessage = 'Air quality is moderate. Sensitive groups should limit outdoor activities.';
                            alertColor = 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200';
                        } else if(pm25 <= 150.4) {
                            alertLevel = 'Unhealthy Alert';
                            alertMessage = 'Air quality is unhealthy. Everyone should limit outdoor activities.';
                            alertColor = 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200';
                        } else {
                            alertLevel = 'Hazardous Alert';
                            alertMessage = 'Air quality is hazardous. Avoid all outdoor activities.';
                            alertColor = 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200';
                        }
                        
                        alertBoxEl.className = `glass-effect border-2 ${alertColor} p-4 rounded-lg mb-4 card-hover`;
                        alertBoxEl.innerHTML = `
                            <div class="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.344 17c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span class="font-semibold">${alertLevel}!</span>
                            </div>
                            <p class="mt-2 text-sm">${alertMessage}</p>
                        `;
                        alertBoxEl.classList.remove('hidden');
                    } else {
                        alertBoxEl.classList.add('hidden');
                    }
                }else{ airQualityResultsContent.textContent='Air quality data unavailable'; alertBoxEl.classList.add('hidden'); }

            }catch(e){ console.error(e); locationNameEl.textContent='Error fetching data'; }
            finally{ loadingOverlay.classList.add('hidden'); }
        }

        function computePrimaryPollutant(sample){
            if(!sample) return { aqiLevel: 'Unknown', primary: 'None' };
            // Thresholds aligned with UI PM2.5 coloring above
            const thresholds = {
                'PM2.5': { Good: 12, Moderate: 35.4, Poor: 55.4 },
                'NO2': { Good: 50, Moderate: 100, Poor: 150 },
                'O3': { Good: 60, Moderate: 120, Poor: 180 }
            };
            const values = {
                'PM2.5': sample.pm2_5 ?? null,
                'NO2': sample.no2 ?? null,
                'O3': sample.o3 ?? null
            };
            let primary = 'None';
            let highest = 0;
            Object.keys(values).forEach(name => {
                const v = values[name];
                if(v==null) return;
                let sev = 0;
                if(v > thresholds[name].Good) sev = 1;      // Above Good = Moderate
                if(v > thresholds[name].Moderate) sev = 2;  // Above Moderate = Poor
                if(v > thresholds[name].Poor) sev = 3;       // Above Poor = Very Poor
                if(sev > highest){ highest = sev; primary = name; }
            });
            let aqiLevel = 'Good';
            if(highest === 1) aqiLevel='Moderate';
            if(highest === 2) aqiLevel='Poor';
            if(highest === 3) aqiLevel='Very Poor';
            return { aqiLevel, primary };
        }

        async function showAdvancedDetails(){
            // Toggle the advanced details section
            if(!advancedDetailsEl.classList.contains('hidden')){
                closeAdvancedDetails();
                return;
            }

            const { aqiLevel, primary } = computePrimaryPollutant(latestAirSample);
            
            advancedDetailsContentEl.innerHTML = \`<div class="flex justify-center items-center p-4">
                <svg class="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="ml-2 text-gray-700 dark:text-gray-200">Generating real AI insights using Gemini...</span>
            </div>\`;
            advancedDetailsEl.classList.remove('hidden');

            try {
                const res = await fetch('/api/suggestions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ primary, aqiLevel, location: locationNameEl.textContent })
                });
                
                if (!res.ok) throw new Error('Failed to fetch AI suggestions');
                const data = await res.json();
                aiSuggestionsCache = data;
                
                const rec = data.advancedDetails;
                advancedDetailsContentEl.innerHTML = \`
                    <p class="mb-2"><span class="font-semibold">Overall Level:</span> \${aqiLevel}</p>
                    <p class="mb-2"><span class="font-semibold">Primary Pollutant:</span> \${primary}</p>
                    <p class="mb-2"><span class="font-semibold text-lg text-blue-600 dark:text-blue-400">\${rec.title}</span></p>
                    <p class="mb-2">\${rec.description}</p>
                    <p class="font-semibold mt-3">Actions:</p>
                    <ul class="list-disc list-inside space-y-1">\${rec.actions.map(a=>\`<li>\${a}</li>\`).join('')}</ul>
                \`;
            } catch (error) {
                console.error(error);
                advancedDetailsContentEl.innerHTML = \`<p class="text-red-500">Error generating AI insights. Please ensure the server is running and the API key is valid.</p>\`;
            }
        }

        function closeAdvancedDetails(){
            advancedDetailsEl.classList.add('hidden');
        }

        function renderSolutionsModal(solutions, primary, aqiLevel) {
            solutionsContent.innerHTML = \`
                <div class="mb-6">
                    <h3 class="text-xl font-bold mb-2 text-blue-600 dark:text-blue-400">Current AI Assessment</h3>
                    <p class="mb-2"><strong>Primary Pollutant:</strong> \${primary}</p>
                    <p class="mb-2"><strong>Air Quality Level:</strong> \${aqiLevel}</p>
                    <p class="text-sm text-gray-600 dark:text-gray-400">AI Generated solutions tailored for \${primary} pollution control</p>
                </div>

                <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex-1">
                        <h4 class="text-lg font-bold mb-3 text-blue-800 dark:text-blue-300">🏛️ Government Actions</h4>
                        <ul class="space-y-2 text-sm">
                            \${solutions.government.map(action => \`<li class="flex items-start"><span class="mr-2">•</span><span>\${action}</span></li>\`).join('')}
                        </ul>
                    </div>

                    <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg flex-1">
                        <h4 class="text-lg font-bold mb-3 text-green-800 dark:text-green-300">🏥 Healthcare Solutions</h4>
                        <ul class="space-y-2 text-sm">
                            \${solutions.healthcare.map(action => \`<li class="flex items-start"><span class="mr-2">•</span><span>\${action}</span></li>\`).join('')}
                        </ul>
                    </div>
                </div>

                <div class="mt-6 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <h4 class="text-lg font-bold mb-2 text-yellow-800 dark:text-yellow-300">💡 Implementation Priority</h4>
                    <div class="text-sm space-y-1">
                        <p><strong>Immediate (0-3 months):</strong> Health alerts, emergency protocols, basic monitoring</p>
                        <p><strong>Short-term (3-12 months):</strong> Healthcare training, public awareness, initial infrastructure</p>
                        <p><strong>Long-term (1-3 years):</strong> Major infrastructure changes, policy implementation, comprehensive monitoring</p>
                    </div>
                </div>
            \`;
        }

        function showSolutionsModal() {
            solutionsModal.classList.remove('hidden');
            const { aqiLevel, primary } = computePrimaryPollutant(latestAirSample);
            
            if (aiSuggestionsCache) {
                renderSolutionsModal(aiSuggestionsCache.governmentSolutions, primary, aqiLevel);
            } else {
                solutionsContent.innerHTML = \`
                    <div class="flex flex-col items-center justify-center p-8">
                        <svg class="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p class="text-gray-700 dark:text-gray-200">Generating tailored AI solutions...</p>
                    </div>
                \`;
                
                fetch('/api/suggestions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ primary, aqiLevel, location: locationNameEl.textContent })
                })
                .then(res => res.json())
                .then(data => {
                    aiSuggestionsCache = data;
                    renderSolutionsModal(data.governmentSolutions, primary, aqiLevel);
                })
                .catch(err => {
                    console.error(err);
                    solutionsContent.innerHTML = \`<p class="text-red-500 p-4">Error generating AI solutions. Please ensure the server is running.</p>\`;
                });
            }
        }

        function closeSolutionsModal() {
            solutionsModal.classList.add('hidden');
        }

        function findMyLocation(){
            locationNameEl.textContent='Finding your location...';
            loadingOverlay.classList.remove('hidden');
            if(navigator.geolocation){
                navigator.geolocation.getCurrentPosition(pos=>{ const lat=pos.coords.latitude; const lon=pos.coords.longitude; initMap(lat,lon); updateUI(lat,lon); },
                err=>{ console.error(err); locationNameEl.textContent='Geolocation failed. Default: London'; initMap(51.5074,-0.1278); updateUI(51.5074,-0.1278); },
                { enableHighAccuracy:true, timeout:15000, maximumAge:0 });
            }else{ locationNameEl.textContent='Geolocation not supported. Default: London'; initMap(51.5074,-0.1278); updateUI(51.5074,-0.1278);}
        }

        async function searchLocation(){
            const query = searchInput.value.trim();
            if(!query) return alert('Please enter a location!');
            loadingOverlay.classList.remove('hidden');
            try{
                const url = \`https://nominatim.openstreetmap.org/search?format=json&q=\${encodeURIComponent(query)}&limit=1\`;
                const res = await fetch(url,{headers:{'Accept-Language':'en'}});
                const data = await res.json();
                if(data.length===0){ alert('Location not found'); return; }
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                initMap(lat, lon); updateUI(lat, lon);
            }catch(e){ console.error(e); alert('Search failed'); }
            finally{ loadingOverlay.classList.add('hidden'); }
        }

        function refreshData(){
            // Add loading animation to refresh button
            const refreshBtn = document.getElementById('refreshBtn');
            const refreshIcon = refreshBtn.querySelector('.refresh-icon');
            
            // Show loading state
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = \`
                <svg class="w-5 h-5 mr-2 refresh-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Refreshing...
            \`;
            
            // Simulate refresh delay for better UX
            setTimeout(() => {
                if(currentLat !== null && currentLon !== null){
                    updateUI(currentLat, currentLon);
                } else {
                    findMyLocation();
                }
                
                // Reset button after update
                setTimeout(() => {
                    refreshBtn.classList.remove('loading');
                    refreshBtn.disabled = false;
                    refreshBtn.innerHTML = \`
                        <svg class="w-5 h-5 mr-2 refresh-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                        Refresh
                    \`;
                }, 1000);
            }, 500);
        }

        findMeBtn.addEventListener('click', findMyLocation);
        searchBtn.addEventListener('click', searchLocation);
        searchInput.addEventListener('keypress', e=>{ if(e.key==='Enter') searchLocation(); });
        detailsBtn.addEventListener('click', showAdvancedDetails);
        refreshBtn.addEventListener('click', refreshData);
        solutionsBtn.addEventListener('click', showSolutionsModal);
        closeModal.addEventListener('click', closeSolutionsModal);
        
        // Close modal when clicking outside
        solutionsModal.addEventListener('click', (e) => {
            if (e.target === solutionsModal) {
                closeSolutionsModal();
            }
        });

        findMyLocation();
        
        // PWA Installation and Service Worker Registration
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw-fin.js')
                    .then(registration => {
                        console.log('SW registered: ', registration);
                    })
                    .catch(registrationError => {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        }
        
        // PWA Install Prompt
        let deferredPrompt;
        const installButton = document.getElementById('installBtn');
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installButton.style.display = 'block';
            installButton.classList.remove('hidden');
        });
        
        installButton.addEventListener('click', () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                    }
                    deferredPrompt = null;
                    installButton.style.display = 'none';
                    installButton.classList.add('hidden');
                });
            }
        });
        
        // Check if app is already installed
        window.addEventListener('appinstalled', (evt) => {
            console.log('App was installed');
            installButton.style.display = 'none';
        });
        
        // Offline functionality
        window.addEventListener('online', () => {
            console.log('App is online');
            // Refresh data when coming back online
            if (typeof updateUI === 'function') {
                // Trigger data refresh
                const event = new CustomEvent('appOnline');
                window.dispatchEvent(event);
            }
        });
        
        window.addEventListener('offline', () => {
            console.log('App is offline');
            // Show offline indicator
            const offlineIndicator = document.createElement('div');
            offlineIndicator.innerHTML = '📡 Offline Mode - Using cached data';
            offlineIndicator.className = 'fixed top-16 left-4 bg-yellow-500 text-white px-4 py-2 rounded-lg z-50';
            offlineIndicator.id = 'offline-indicator';
            document.body.appendChild(offlineIndicator);
        });
        
        // Remove offline indicator when online
        window.addEventListener('online', () => {
            const offlineIndicator = document.getElementById('offline-indicator');
            if (offlineIndicator) {
                offlineIndicator.remove();
            }
        });
        
        // Background sync for air quality data
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                // Register background sync
                registration.sync.register('background-sync');
            });
        }
        
        // Push notification permission request
        function requestNotificationPermission() {
            if ('Notification' in window) {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        console.log('Notification permission granted');
                        // Subscribe to push notifications
                        subscribeToPushNotifications();
                    }
                });
            }
        }
        
        function subscribeToPushNotifications() {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                    return registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: 'your-vapid-public-key' // Replace with actual VAPID key
                    });
                }).then(subscription => {
                    console.log('Push subscription:', subscription);
                    // Send subscription to server
                });
            }
        }
        
        // Add notification button to header
        const notificationButton = document.createElement('button');
        notificationButton.innerHTML = '🔔';
        notificationButton.className = 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-2 rounded-full shadow-lg transition-colors duration-300 transform hover:scale-110 active:scale-95';
        notificationButton.title = 'Enable Notifications';
        notificationButton.addEventListener('click', requestNotificationPermission);
        document.querySelector('.header-buttons').appendChild(notificationButton);
    });