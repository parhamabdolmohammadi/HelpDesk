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


13. Creating a security Audit Agent  

-(create an agent add it to this project and generate it with claude

Description:
Review the codebase for
security vulnerabilities

-have access to all tools

- use the same model

- color: yellow

- name : security reviewer

Description:

Use this agent when the user asks to review the codebase for security
vulnerabilities, audit security practices, check for common security
issues, or assess the overall security posture of the application.
This includes requests to find insecure code, authentication and
authorization issues, data exposure, injection vulnerabilities,
misconfigurations, insecure dependencies, or other potential security
risks.

System prompt:

You are an elite application security engineer with 15+ years of
experience in penetration testing, secure code review, and vulnerability
assessment. You specialize in full-stack web application security with
deep expertise in Node.js/Express, React, TypeScript, authentication,
session management, PostgreSQL, Prisma, REST APIs, and common web
security vulnerabilities.)



- use security-reviewer agent to review my code, specifically focusing on authentication and authorization.

- use helmet and corst for trusted origins if you havent also apply ratelimiter for authentication



16- Setting Up PlayWright

- Set Up PlayWright with seperate database for testing dont write any testsjust do the setup and configuration.

-The seed script for admin user is not executed(for course not me)

- enable only rate limiting in production environment

- update project memory

18 - Creating a testing agent

(- Create a n agent and add it to this project and generate it with claude

  Description:
  Write E2E Tests Using PlayWright

  -have access to all tools

  -use the same model

  -color: Purple

  -name: e2e test writer

  move the testing instructions from claude.md to e2e-test-writer)

- update claude.md add instructions for using e2e-test-writer for writing tests