# Lessons

Log of prompts the user has flagged as important (marked with `imptp`) while
working through this project, organized by lesson and sub-lesson as the user
announces them.

<!--
Format:
## <Lesson Name>
### <Sub-lesson Name>
- <verbatim prompt text>
-->

## Authentication

### Sessions

4- Setting Up Better Auth

- set up better auth with email/password and use database sessions. bare minimum no ui ask me any clarifying questions

5- Reviewing Authentication Setup

- Start The Server and Test Auth flow
  
6- Registering Users

- Disable The Signup Endpoit

- Send a Curl REquest to make sure sign up is disabled

-create a seed script to populate the database with an admin user

7-building a login Page 

- build the login page. when the user logs in,
redirect them to the home page and show the
user's name in the nav bar along with a
sign out button.

- when i login i get an error invalid origin

8- Reviewing the login page

-in @../server/src/lib/auth.ts, replace the
hardcoded trustedorigin with an environment
@../server/src/lib/auth.ts

9- Implemeinting Validation

-Use React Hook Form With zod

- If a field is invalid show a red border around that field

10- Adding Tailwind

- install tailwind and use it on all pages

- Remove All custom css code and replace it with tailwind css and make sure its exaclty as it was before

11- Installing shadcn

- install shadcn and use defalt theme

- now lets build the login page using shadcn components

- change the color of the navbar to white

- Update the project memory

- add necessary details about athentication in claude.md

12. Implementing Role Based Access

- create a page at /users with just a heading. make it accessible only to admins

- add a link to the users page in nav for admins

- create an agent user
  email: agent@example.com password: password123