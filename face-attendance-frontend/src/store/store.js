import { configureStore } from '@reduxjs/toolkit';

// Since no reducers are defined yet, create an empty store
// Add reducers as needed for state management
const store = configureStore({
  reducer: {
    // Add your reducers here, e.g.:
    // user: userReducer,
    // attendance: attendanceReducer,
  },
});

export default store;
