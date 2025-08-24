-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."client_databases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "timeout_minutes" INTEGER NOT NULL DEFAULT 30,
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_databases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "database_id" TEXT NOT NULL,
    "custom_data" JSONB NOT NULL DEFAULT '{}',
    "last_access" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."access_points" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."access_details" (
    "id" TEXT NOT NULL,
    "access_point_id" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "last_edited_by" TEXT NOT NULL,
    "last_edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."access_images" (
    "id" TEXT NOT NULL,
    "access_point_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "image_data" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."access_details_history" (
    "id" TEXT NOT NULL,
    "access_point_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "edited_by" TEXT NOT NULL,
    "edited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_details_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "access_details_access_point_id_key" ON "public"."access_details"("access_point_id");

-- CreateIndex
CREATE UNIQUE INDEX "access_details_history_access_point_id_version_key" ON "public"."access_details_history"("access_point_id", "version");

-- AddForeignKey
ALTER TABLE "public"."client_databases" ADD CONSTRAINT "client_databases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_database_id_fkey" FOREIGN KEY ("database_id") REFERENCES "public"."client_databases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."access_points" ADD CONSTRAINT "access_points_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."access_details" ADD CONSTRAINT "access_details_access_point_id_fkey" FOREIGN KEY ("access_point_id") REFERENCES "public"."access_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."access_details" ADD CONSTRAINT "access_details_last_edited_by_fkey" FOREIGN KEY ("last_edited_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."access_images" ADD CONSTRAINT "access_images_access_point_id_fkey" FOREIGN KEY ("access_point_id") REFERENCES "public"."access_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."access_details_history" ADD CONSTRAINT "access_details_history_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
