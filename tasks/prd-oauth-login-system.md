
# PRD: OAuth 2.0 Login System

## 1. Introduction/Overview

This document outlines the functional and technical requirements for the existing OAuth 2.0 Login System. The system is designed to allow users to authenticate using third-party identity providers, providing a secure and streamlined login experience. The implementation also serves as an educational tool, visually demonstrating the entire OAuth 2.0 Authorization Code Grant flow.

The primary goal is to provide a reference for the current implementation, detailing its features, components, and the user journey from login to logout.

## 2. Goals

*   To securely authenticate users via third-party OAuth providers.
*   To provide a clear, user-friendly interface for logging in and viewing session information.
*   To serve as a detailed, interactive example of the OAuth 2.0 Authorization Code Grant flow for educational purposes.
*   To manage user sessions effectively, including token storage, expiration, and automated refresh.
*   To maintain a consistent and normalized user profile structure regardless of the authentication provider.

## 3. User Stories

*   **As a new user**, I want to sign in to the application using my existing Google, GitHub, or Discord account so that I don't have to create a new password.
*   **As an authenticated user**, I want to see my basic profile information (name, email, avatar) on my dashboard so I know I'm logged in correctly.
*   **As an authenticated user**, I want to be able to log out of the application to securely end my session.
*   **As a developer learning OAuth**, I want to see a visual breakdown of the entire authentication process, including the exchange of codes and tokens, so I can better understand how it works.
*   **As a user with a long-running session**, I want the application to automatically refresh my session without forcing me to log in again.

## 4. Functional Requirements

### 4.1. Authentication
1.  The system **must** allow users to initiate login with the following OAuth providers:
    *   Google
    *   GitHub
    *   Discord
2.  The login page **must** display a separate, clearly labeled login option for each supported provider.
3.  Upon clicking a provider option, the user **must** be redirected to the provider's official consent screen to authorize the application.
4.  The system **must** use a unique `state` parameter for each authentication request to prevent Cross-Site Request Forgery (CSRF) attacks. This state must be validated upon callback.

### 4.2. Callback Handling
1.  After authorization, the user **must** be redirected back to a `/callback` page within the application.
2.  The callback handler **must** extract the `authorization_code` and `state` from the URL.
3.  The callback handler **must** validate that the received `state` matches the one originally generated. If it does not match, the authentication process must be aborted, and an error shown.
4.  The application **must** send the `authorization_code` to a secure backend API endpoint (`/api/oauth/token`) to be exchanged for an access token.

### 4.3. Session Management (Client-Side)
1.  Upon successful token exchange, the system **must** create a user session and store it securely in the browser's `localStorage`.
2.  The session data **must** include the user's profile information and the OAuth tokens (access and refresh tokens).
3.  The system **must** implement a short-lived client-side session (5 minutes) to reduce redundant session verification checks for active users.
4.  The system **must** automatically detect when an access token is expired.
5.  If a refresh token is available, the system **must** automatically use it to request a new access token from the backend API, seamlessly updating the user's session.
6.  The user session **must** be cleared from storage upon logout.

### 4.4. Dashboard
1.  Authenticated users **must** be redirected to a `/dashboard` page.
2.  The dashboard **must** display the user's profile information, including:
    *   Name
    *   Email
    *   Avatar/Profile Picture
    *   The provider used for login.
3.  The dashboard **must** display the details of the current OAuth tokens (access and refresh tokens).
4.  The dashboard **must** provide functionality to manually trigger a token refresh.
5.  The dashboard **must** provide a "Logout" button that terminates the session and redirects to the login page.
6.  The dashboard **must** feature an interactive, step-by-step visualization of the completed OAuth 2.0 flow, showing the artifacts exchanged at each step (e.g., Authorization Code, Access Token).

## 5. Non-Goals (Out of Scope)

*   Traditional email and password authentication.
*   User registration a part from the OAuth flow.
*   User roles or permissions (e.g., admin, user).
*   Account linking (i.e., connecting multiple OAuth providers to a single application account).
*   Allowing users to edit their profile information within the application.

## 6. Technical Considerations

*   **Framework:** The application is built with Next.js and React.
*   **Styling:** Tailwind CSS is used for styling.
*   **State Management:** Client-side state is managed through React hooks (`useState`, `useEffect`) and a custom `TokenManager` class.
*   **Security:**
    *   CSRF protection is implemented via the `state` parameter in the OAuth flow.
    *   Client secrets and sensitive API logic are handled exclusively on the backend within Next.js API Routes. Tokens are exchanged server-side.
*   **Session Persistence:** The user session is persisted in `localStorage` to survive page reloads and browser restarts.

## 7. Success Metrics

*   **Successful Login Rate:** Percentage of users who successfully complete the login flow after initiating it.
*   **Session Refresh Rate:** Number of successful automatic token refreshes.
*   **User Engagement with Flow Diagram:** (If analytics were added) Time spent interacting with the educational OAuth flow visualization on the dashboard.
