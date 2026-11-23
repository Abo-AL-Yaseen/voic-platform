import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";
export class ProfileDto {
  @IsString() @Length(1, 100) @Matches(/\S/) name!: string;
  @IsIn(["individual", "company"]) kind!: "individual" | "company";
  @ValidateIf((o) => o.kind === "company" || o.company !== undefined)
  @IsString()
  @MaxLength(150)
  company?: string;
  @IsString() @Length(1, 100) @Matches(/\S/) country!: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
}
export class ContextDto {
  @IsOptional() @IsIn(["ar", "en"]) lang?: "ar" | "en";
  @IsOptional() @IsString() @MaxLength(2000) returnTo?: string;
}
export class EmailDto extends ContextDto {
  @IsEmail({ allow_utf8_local_part: false })
  @MaxLength(254)
  @Matches(/^[\x21-\x7e]+$/)
  email!: string;
}
export class RegisterDto extends ProfileDto {
  @IsEmail({ allow_utf8_local_part: false })
  @MaxLength(254)
  @Matches(/^[\x21-\x7e]+$/)
  email!: string;
  @IsString() @Length(15, 128) password!: string;
  @IsOptional() @IsIn(["ar", "en"]) lang?: "ar" | "en";
  @IsOptional() @IsString() @MaxLength(2000) returnTo?: string;
}
export class LoginDto {
  @IsEmail({ allow_utf8_local_part: false }) @MaxLength(254) email!: string;
  @IsString() @Length(1, 128) password!: string;
}
export class TokenDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) token!: string;
}
export class ResetDto extends TokenDto {
  @IsString() @Length(15, 128) password!: string;
}
export class ChangePasswordDto {
  @IsString() @Length(1, 128) currentPassword!: string;
  @IsString() @Length(15, 128) password!: string;
}
export class EmptyDto {}
