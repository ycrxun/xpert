import { IEnvironment } from "./types"

let API_BASE_URL = '//localhost:3000'

export const environment: IEnvironment = {
	version: '3.2.9',
	production: false,
	DEMO: false,
	API_BASE_URL: API_BASE_URL,
	IS_ELECTRON: false,
	enableLocalAgent: false,

	GOOGLE_AUTH_LINK: API_BASE_URL + '/api/auth/google',
	FACEBOOK_AUTH_LINK: API_BASE_URL + '/api/auth/facebook',
	LINKEDIN_AUTH_LINK: API_BASE_URL + '/api/auth/linkedin',
	GITHUB_AUTH_LINK: API_BASE_URL + '/api/auth/github',
	TWITTER_AUTH_LINK: API_BASE_URL + '/api/auth/twitter',
	MICROSOFT_AUTH_LINK: API_BASE_URL + '/api/auth/microsoft',
	AUTH0_AUTH_LINK: API_BASE_URL + '/api/auth/auth0'
}