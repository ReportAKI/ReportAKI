import Pocketbase from 'pocketbase';

// Ορισμός της τοπικής διεύθυνσης του PocketBase διακομιστή
const POCKETBASE_API_URL = 'https://reportaki.onrender.com';

const pocketbaseClient = new Pocketbase(POCKETBASE_API_URL);

export default pocketbaseClient;

export { pocketbaseClient };