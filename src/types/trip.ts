export interface TripRequest {
  destination: string;
  days: number;
  vibe: string;
}

export interface TripResponse {
  message: string;
}


/* interface = a TypeScript blueprint that describes the shape of an object

TripRequest = the name we're giving this blueprint

export = makes it available to use in other files

Inside TripRequest:

destination: string;   // must be text
days: number;          // must be a number
vibe: string;          // must be text

TripResponse = This describes what comes back from the server

If someone tries to submit the form without filling in destination, TypeScript immediately says 
 "Hey! You missed a required field!"
*/ 
