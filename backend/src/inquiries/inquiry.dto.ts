import { Type } from "class-transformer";
import {
  IsDefined,
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
export class CreateInquiryDto {
  @IsUUID("4") creationKey!: string;
  @IsIn(["ar", "en"]) lang!: "ar" | "en";
}
export class InquiryFieldsDto {
  @IsIn(["individual", "company"]) kind!: "individual" | "company";
  @IsString() @MaxLength(100) name!: string;
  @IsString() @MaxLength(150) company!: string;
  @IsString() @MaxLength(200) destination!: string;
  @IsString() @MaxLength(40) phone!: string;
  @IsString() @MaxLength(3000) notes!: string;
}
export class InquiryLineDto {
  @IsString() @Length(1, 64) @Matches(/^[a-z0-9-]+$/) productId!: string;
  @IsOptional() @IsString() @Length(1, 80) packageId!: string | null;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3, allowNaN: false, allowInfinity: false })
  @Min(0.001)
  @Max(1000000)
  quantity!: number | null;
  @IsOptional() @IsIn(["packages", "kg", "L"]) unit!: "packages" | "kg" | "L" | null;
  @IsString() @MaxLength(1000) requirements!: string;
}
export class SaveInquiryDto {
  @IsInt() @Min(1) @Max(1000000) revision!: number;
  @IsIn(["ar", "en"]) lang!: "ar" | "en";
  @IsDefined() @ValidateNested() @Type(() => InquiryFieldsDto) fields!: InquiryFieldsDto;
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => InquiryLineDto)
  items!: InquiryLineDto[];
}
export class SubmitInquiryDto {
  @IsUUID("4") key!: string;
  @IsInt() @Min(1) @Max(1000000) revision!: number;
}
