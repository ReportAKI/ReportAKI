import Pocketbase from 'pocketbase';

// Ορισμός της τοπικής διεύθυνσης του PocketBase διακομιστή
const POCKETBASE_API_URL = 'http://127.0.0.1:8090';

const pocketbaseClient = new Pocketbase(POCKETBASE_API_URL);

export default pocketbaseClient;

export { pocketbaseClient };