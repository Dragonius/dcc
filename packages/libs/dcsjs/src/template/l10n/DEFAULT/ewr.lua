local logName = 'DCS.JS.EWR'
local function debugLog(message) log.write(logName, log.INFO, tostring(message)) end

DEWR = {}

function DEWR:New(groupId, groupName)
    local groupConfig = {}
    groupConfig.groupId = groupId
    groupConfig.groupName = groupName

    

    --missionCommands.addCommandForGroup(groupId, "BRAA Strike Group", groupConfig.menuRootPath, DEscort.braa, groupName)

    DEWR[groupName] = groupConfig
    
    return self
end

local function calcAspect(targetHeading, targetVec, clientVec)
    -- local targetDir = mist.utils.round(mist.utils.toDegree(mist.utils.getDir(clientVec, targetVec)), 0)
    local targetDir =  mist.utils.round(mist.utils.toDegree(mist.utils.getDir(mist.vec.sub(clientVec, targetVec), targetVec)), 0)
    -- local directionToClient = directionToTarget + 180
    -- if directionToClient > 360 then
        -- directionToClient = directionToClient - 360
    -- end
    local aspect = math.abs(targetHeading - targetDir)

    -- Determine aspect based on angle
    if aspect < 45 then
        return "Hot"
    elseif aspect > 135 then
        return "Cold"
    else
        return "Flank"
    end
end

local function comparePlanes(a, b)
    return a.distance > b.distance
end

local function degreesToClockPosition(degrees)
    local positions = {
        "12 o'clock", "1 o'clock", "2 o'clock", "3 o'clock",
        "4 o'clock", "5 o'clock", "6 o'clock", "7 o'clock",
        "8 o'clock", "9 o'clock", "10 o'clock", "11 o'clock"
    }
    local index = math.floor((degrees % 360) / 30) + 1
    return positions[index]
end

local function degreesToMagneticDegrees(degrees)
    local magneticDegrees = degrees - 7
    if magneticDegrees < 0 then
        magneticDegrees = magneticDegrees + 360
    end

    return magneticDegrees
end

local function visualCallout(plane, clientHeading, clientAlt)
    local altText = ""

    if plane.altitude > clientAlt then
        altText = " HIGH angel " .. tostring(plane.altitude / 1000)
    end

    if plane.altitude < clientAlt then
        altText = " LOW angel " .. tostring(plane.altitude / 1000)
    end

    local delta = plane.direction - clientHeading

    if delta < 0 then
        delta = delta + 360
    end

    return degreesToClockPosition(delta) .. altText .. " " .. plane.unitType
end

local function getPlanes(clientName, range)
    local redPlanes = mist.makeUnitTable({'[red][plane]'})
    local inRange = mist.getUnitsInMovingZones(redPlanes, {clientName}, range, 'cylinder')

    local clientPoint = Unit.getByName(clientName):getPosition().p
    local clientVec = mist.utils.makeVec3(clientPoint)
    local clientAlt = mist.utils.round(mist.utils.metersToFeet(clientVec.y) / 1000) * 1000

    local planes = {}

    for index, unit in pairs(inRange) do
        --local redGroup = unit:getGroup()
        local unitType = unit:getTypeName();

        if unitType ~= "A-50" then
            local unitHeading = mist.utils.round(mist.utils.toDegree(mist.getHeading(unit)));
            local unitVec = mist.utils.makeVec3(unit:getPosition().p)
            local dir =  mist.utils.round(mist.utils.toDegree(mist.utils.getDir(mist.vec.sub(unitVec, clientVec), clientPoint)), 0)
            local dist = mist.utils.round(mist.utils.metersToNM(mist.utils.get2DDist(unitVec, clientVec)), 0)
            local alt = mist.utils.round(mist.utils.metersToFeet(unitVec.y) / 1000) * 1000

            local aspect = calcAspect(unitHeading, unitVec, clientVec)

            local group = unit:getGroup()

            if group == nil then
                debugLog("group is nil")
                return
            end

            local plane = {
                unitType = unitType,
                groupName = group:getName(),
                distance = dist,
                direction = dir,
                altitude = alt,
                aspect = aspect
            }

            planes[#planes + 1] = plane
        end
    end

    table.sort(planes, comparePlanes)

    return planes
end

local function getGroupedPlanes(clientName, range)
    local planes = getPlanes(clientName, range)
    local groupes = {}

    for index, plane in pairs(planes) do
        if groupes[plane.groupName] == nil then
            groupes[plane.groupName] = {}
        end

        groupes[plane.groupName][#groupes[plane.groupName] + 1] = plane
    end

    return groupes
end

function DEWR.Tick(clientName)
    
    local clientUnit = Unit.getByName(clientName)

    if clientUnit == nil then
        debugLog("clientUnit is nil")
        return
    end

    local clientGroup = clientUnit:getGroup()

    if clientGroup == nil then
        debugLog("clientGroup is nil")
        return
    end

    local groupConfig = DEWR[clientGroup:getName()]

    debugLog("tick " .. clientName)

    if groupConfig == nil or groupConfig.inWVR == false then
        local groups = getGroupedPlanes(clientName, 160000)
        local text = ""

        for index, group in pairs(groups) do
            local plane = group[1]
            text = text .. string.format('%03d', degreesToMagneticDegrees(plane.direction)) .. " for " .. tostring(plane.distance) .. "nm at " .. tostring(plane.altitude) .. "ft " .. plane.aspect .. ", " .. tostring(#group) .. "x " .. plane.unitType .. "\n"
        end
 
        debugLog("send message to " .. clientName)
        Utils.sendMessageToUnits(string.sub(text, 0, -2), {clientName}, 10)
    end
end

function DEWR.TickVisual(clientName)
    local clientUnit = Unit.getByName(clientName)
    local clientPoint = clientUnit:getPosition().p
    local clientVec = mist.utils.makeVec3(clientPoint)
    local clientAlt = mist.utils.round(mist.utils.metersToFeet(clientVec.y) / 1000) * 1000
    local clientHeading = mist.utils.round(mist.utils.toDegree(mist.getHeading(clientUnit)));
    local planes = getPlanes(clientName, 10000)

    if clientUnit:getGroup() == nil then
        debugLog("client unit group is nil")
        return
    end

    local groupConfig = DEWR[clientUnit:getGroup():getName()]

    local text = ""
    if #planes > 0 then

        for index, plane in pairs(planes) do
            text = text .. visualCallout(plane, clientHeading, clientAlt) .. "\n"
        end

        if groupConfig then
            groupConfig.inWVR = true
        end
    else
        if groupConfig then
            groupConfig.inWVR = false
        end
    end

    Utils.sendMessageToUnits(string.sub(text, 0, -2), {clientName}, 3)
end

function DEWR.StartInterval(groupName, clientName)
    debugLog("start interval for " .. groupName .. "/" .. clientName)
    local groupConfig = DEWR[groupName]

    debugLog("group config " .. tostring(groupConfig))

    if groupConfig then
        groupConfig.wvrSchedule = mist.scheduleFunction(DEWR.TickVisual, {clientName}, timer.getTime(), 5)
        groupConfig.bvrSchedule = mist.scheduleFunction(DEWR.Tick, {clientName}, timer.getTime(), 20)
    end
end

DEWR.eventHandler = {}
function DEWR:onEvent(event)
    if event.id == world.event.S_EVENT_BIRTH and event.initiator then
        if event.initiator == nil then
            debugLog("event.initiator is nil")
            return
        end

        local name = event.initiator:getName()
        local unit = Unit.getByName(name)

        if unit then
            local playerName = unit:getPlayerName()
            local group = unit:getGroup()
            if group and playerName then
                debugLog("birth " .. playerName)
                local groupName = group:getName()

                local groupConfig = DEWR[groupName]

                if groupConfig then
                    debugLog("add ewr menu for client " .. name)
                    local rootPath = missionCommands.addSubMenuForGroup(groupConfig.groupId, "EWR")
                    missionCommands.addCommandForGroup(groupConfig.groupId, "Start", rootPath, DEWR.StartInterval, groupName, name)
                end
            end
        end
    end
end

function DEWR.Start()
    debugLog("EWR Start")
    world.addEventHandler(DEWR)
end