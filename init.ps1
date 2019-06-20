
# I don't have Linux so this might not work on Linux (works fine in WSL)
$archPrefix = "x86"
if ([system.environment]::Is64BitOperatingSystem)
{
    $archPrefix = "x64"
}

# More help on determine os can be found here https://stackoverflow.com/questions/44703646/determine-the-os-version-linux-and-windows-from-powershell
# NOTE: Linux and MacOs do not work I can't test it yet since I don't have those OSes
$packageType = "msi"
if ($IsLinux)
{
  $packageType = "gz"
}
if ($IsMacOS)
{
    # Mac what?
  Write-Output "Mac is not supported"
  exit
}
Write-Output "Using configuration for $($archPrefix):$($packageType)"


$npmShare = "https://nodejs.org/dist/latest-v10.x/"
# more on Invoke-WebRequest can be foudn here https://4sysops.com/archives/powershell-invoke-webrequest-parse-and-scrape-a-web-page/
$WebResponse = Invoke-WebRequest -Method Get -Uri $npmShare
$fileName = $null

ForEach ($link in $WebResponse.Links | Select href)
{
  if (($link -match $archPrefix) -and ($link -match $packageType))
  {
    Write-Output "Downloading $($npmShare)$($link.href)"
    $fileName = $link.href
    #Invoke-WebRequest -Uri "$($npmShare)$($link.href)" -OutFile $fileName
    continue
  }
}

Write-Output "Output file $($fileName)"

if (Test-Path $fileName)
{
  Write-Output "Installing NodeJS"
  & msiexec.exe /qbn /l* node-log.txt /i $fileName
}
else
{
  Write-Output "File was not downloaded successfuly"
}


# TODO:
# do a git clone here for a user
# user shoudl be pased as a parameter
# This needs to be expanded to run npm commands
# npm install
# npm install -g @angular/cli
# after npm is installed