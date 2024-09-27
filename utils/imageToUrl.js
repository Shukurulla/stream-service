export const imageToUrl = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "restoran-order");
  formData.append("cloud_name", "djsdapm3z");
  const url = await fetch(
    "https://api.cloudinary.com/v1_1/djsdapm3z/image/upload",
    {
      method: "POST",
      body: formData,
    }
  )
    .then((res) => res.json())
    .then((data) => {
      console.log(data);

      return data.secure_url;
    })
    .catch((err) => {
      console.log(err);
    });

  return url;
};
