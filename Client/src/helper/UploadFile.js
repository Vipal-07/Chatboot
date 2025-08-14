const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dfeimiswp/image/upload";

const UploadFile = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append("upload_preset", "Upload_Profile")
    formData.append("cloud_name", "dfeimiswp");

    const response = await fetch(CLOUDINARY_URL, {
        method: 'post',
        body: formData
    })
    const responseData = await response.json()


    return responseData
}

export default UploadFile