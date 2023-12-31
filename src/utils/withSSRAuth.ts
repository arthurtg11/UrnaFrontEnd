import {
    GetServerSideProps,
    GetServerSidePropsContext,
    GetServerSidePropsResult,
  } from "next";
  import { destroyCookie, parseCookies } from "nookies";
  import decode from "jwt-decode";
  import { AuthTokenError } from "../services/errors/AuthTokenError";
  import { validateuserPermissions } from "./validateUserPermissions";
  
  type withSSRAuthOptions = {
    permissions?: string[];
    roles?: string[];
  };
  
  export function withSSRAuth<P>(
    fn: GetServerSideProps<P>,
    options?: withSSRAuthOptions
  ) {
    return async (
      ctx: GetServerSidePropsContext
    ): Promise<GetServerSidePropsResult<P>> => {
      const cookies = parseCookies(ctx);
      const token = cookies["ec.token"];
      if (!token) {
        return {
          redirect: {
            destination: "/",
            permanent: false,
          },
        };
      }
  
      if (options) {
        const user = decode<{ permissions: string[]; roles: string[] }>(token);
        const { permissions, roles } = options;
  
        const userHasValidPermissions = validateuserPermissions({
          user,
          permissions,
          roles,
        });
  
        if(!userHasValidPermissions){
          return {
            redirect: {
              destination: '/',
              permanent: false
            }
          }
        }
      }
  
      try {
        return await fn(ctx);
      } catch (err) {
        if (err instanceof AuthTokenError) {
          destroyCookie(ctx, "ec.token");
          destroyCookie(ctx, "ec.refreshToken");
  
          return {
            redirect: {
              destination: "/",
              permanent: false,
            },
          };
        } else {
          return {
            redirect: {
              destination: "/",
              permanent: false,
            },
          };
        }
      }
    };
  }