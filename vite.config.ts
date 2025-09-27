const API_URL = import.meta.env.VITE_API_URL;

export async function fetchPlanets() {
  const response = await fetch(`${API_URL}/planets`);
  return response.json();
}
